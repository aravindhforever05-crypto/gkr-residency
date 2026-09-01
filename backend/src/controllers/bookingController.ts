import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { differenceInDays, parseISO, format } from 'date-fns';

const generateBookingId = async (): Promise<string> => {
  const now = new Date();
  const prefix = `GKR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const result = await pool.query(
    `SELECT COUNT(*) FROM bookings WHERE booking_id LIKE $1`,
    [`${prefix}%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `${prefix}-${count.toString().padStart(3, '0')}`;
};

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_id,
      room_id,
      check_in_date,
      check_out_date,
      num_guests,
      room_rate,
      additional_charges = 0,
      discount = 0,
      advance_amount = 0,
      payment_method = 'CASH',
      booking_source = 'WALK_IN',
      special_requests,
    } = req.body;

    // Validate dates
    const checkIn = parseISO(check_in_date);
    const checkOut = parseISO(check_out_date);
    const numDays = differenceInDays(checkOut, checkIn);

    if (numDays <= 0) {
      res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
      await client.query('ROLLBACK');
      return;
    }

    // Check room exists and is not maintenance/blocked
    const roomResult = await client.query(
      `SELECT id, room_number, status, base_price FROM rooms WHERE id = $1 AND is_active = true`,
      [room_id]
    );
    if (roomResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      await client.query('ROLLBACK');
      return;
    }
    const room = roomResult.rows[0];
    if (room.status === 'MAINTENANCE' || room.status === 'BLOCKED') {
      res.status(400).json({ success: false, message: `Room ${room.room_number} is under ${room.status.toLowerCase()} and cannot be booked` });
      await client.query('ROLLBACK');
      return;
    }

    // Check overlapping bookings (double booking prevention)
    const overlapResult = await client.query(
      `SELECT b.booking_id, b.check_in_date, b.check_out_date, c.name as customer_name
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.room_id = $1
         AND b.booking_status NOT IN ('CANCELLED', 'CHECKED_OUT')
         AND b.is_deleted = false
         AND b.check_in_date < $3
         AND b.check_out_date > $2`,
      [room_id, check_in_date, check_out_date]
    );

    if (overlapResult.rows.length > 0) {
      const conflict = overlapResult.rows[0];
      res.status(409).json({
        success: false,
        message: `Room ${room.room_number} is already booked for the selected dates (Booking: ${conflict.booking_id}, Customer: ${conflict.customer_name}, ${conflict.check_in_date} to ${conflict.check_out_date})`,
        conflict: conflict,
      });
      await client.query('ROLLBACK');
      return;
    }

    // Calculate amounts
    const effectiveRate = room_rate || room.base_price;
    const roomAmount = effectiveRate * numDays;
    const totalAmount = roomAmount + Number(additional_charges) - Number(discount);
    const paidAmount = Number(advance_amount);
    const pendingAmount = totalAmount - paidAmount;
    const paymentStatus = paidAmount >= totalAmount ? 'FULLY_PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    const bookingId = await generateBookingId();

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (
        booking_id, customer_id, room_id, check_in_date, check_out_date,
        num_guests, num_days, room_rate, room_amount, additional_charges,
        discount, total_amount, paid_amount, pending_amount, payment_status,
        booking_status, booking_source, special_requests, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        bookingId, customer_id, room_id, check_in_date, check_out_date,
        num_guests || 1, numDays, effectiveRate, roomAmount, additional_charges,
        discount, totalAmount, paidAmount, pendingAmount, paymentStatus,
        'CONFIRMED', booking_source, special_requests, req.user?.id,
      ]
    );

    const booking = bookingResult.rows[0];

    // Update room status
    const today = format(new Date(), 'yyyy-MM-dd');
    let newRoomStatus = 'BOOKED';
    if (check_in_date === today) newRoomStatus = 'CHECK_IN_TODAY';

    await client.query(`UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2`, [newRoomStatus, room_id]);

    // Record advance payment if any
    if (paidAmount > 0) {
      await client.query(
        `INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_type, collected_by)
         VALUES ($1, $2, $3, $4, 'ADVANCE', $5)`,
        [booking.id, customer_id, paidAmount, payment_method, req.user?.id]
      );
    }

    // Create notification for today's check-in
    if (check_in_date === today) {
      const custResult = await client.query(`SELECT name FROM customers WHERE id = $1`, [customer_id]);
      await client.query(
        `INSERT INTO notifications (type, title, message, entity_type, entity_id)
         VALUES ('CHECK_IN_TODAY', 'Check-in Today', $1, 'BOOKING', $2)`,
        [`${custResult.rows[0]?.name} is checking in today - Room ${room.room_number}`, booking.id]
      );
    }

    await client.query('COMMIT');

    // Fetch full booking details
    const fullBooking = await pool.query(
      `SELECT b.*, c.name as customer_name, c.mobile, r.room_number, f.floor_number
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN rooms r ON b.room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.id = $1`,
      [booking.id]
    );

    res.status(201).json({ success: true, data: fullBooking.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  } finally {
    client.release();
  }
};

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search, status, payment_status, booking_source, floor,
      check_in_from, check_in_to, check_out_from, check_out_to,
      page = '1', limit = '20'
    } = req.query;

    let query = `
      SELECT b.*, c.name as customer_name, c.mobile, r.room_number, f.floor_number
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN floors f ON r.floor_id = f.id
      WHERE b.is_deleted = false
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      query += ` AND (c.name ILIKE $${idx} OR c.mobile ILIKE $${idx} OR b.booking_id ILIKE $${idx} OR r.room_number ILIKE $${idx})`;
    }
    if (status) {
      params.push(status);
      query += ` AND b.booking_status = $${params.length}`;
    }
    if (payment_status) {
      params.push(payment_status);
      query += ` AND b.payment_status = $${params.length}`;
    }
    if (booking_source) {
      params.push(booking_source);
      query += ` AND b.booking_source = $${params.length}`;
    }
    if (floor) {
      params.push(floor);
      query += ` AND f.floor_number = $${params.length}`;
    }
    if (check_in_from) {
      params.push(check_in_from);
      query += ` AND b.check_in_date >= $${params.length}`;
    }
    if (check_in_to) {
      params.push(check_in_to);
      query += ` AND b.check_in_date <= $${params.length}`;
    }

    // Count
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as sub`, params);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum, offset);
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get bookings' });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, c.name as customer_name, c.mobile, c.email, c.address, c.id_proof_type, c.id_proof_number,
              r.room_number, r.room_type, r.amenities, f.floor_number, f.name as floor_name,
              u.name as created_by_name
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN rooms r ON b.room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       LEFT JOIN users u ON b.created_by = u.id
       WHERE (b.id = $1 OR b.booking_id = $1) AND b.is_deleted = false`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Get payments
    const payments = await pool.query(
      `SELECT p.*, u.name as collected_by_name FROM payments p
       LEFT JOIN users u ON p.collected_by = u.id
       WHERE p.booking_id = $1 AND p.is_deleted = false ORDER BY p.payment_date`,
      [result.rows[0].id]
    );

    res.json({ success: true, data: { ...result.rows[0], payments: payments.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get booking' });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { check_in_date, check_out_date, num_guests, room_rate, additional_charges, discount, special_requests } = req.body;

    const existing = await client.query(
      `SELECT * FROM bookings WHERE (id=$1 OR booking_id=$1) AND is_deleted=false`,
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = existing.rows[0];

    const newCheckIn = check_in_date || booking.check_in_date;
    const newCheckOut = check_out_date || booking.check_out_date;
    const numDays = differenceInDays(parseISO(newCheckOut), parseISO(newCheckIn));

    if (numDays <= 0) {
      res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
      await client.query('ROLLBACK');
      return;
    }

    // Check for overlap excluding this booking
    if (check_in_date || check_out_date) {
      const overlap = await client.query(
        `SELECT booking_id FROM bookings
         WHERE room_id=$1 AND id!=$2 AND booking_status NOT IN ('CANCELLED','CHECKED_OUT')
         AND is_deleted=false AND check_in_date < $4 AND check_out_date > $3`,
        [booking.room_id, booking.id, newCheckIn, newCheckOut]
      );
      if (overlap.rows.length > 0) {
        res.status(409).json({ success: false, message: `Room is already booked for ${overlap.rows[0].booking_id}` });
        await client.query('ROLLBACK');
        return;
      }
    }

    const effectiveRate = room_rate || booking.room_rate;
    const roomAmount = effectiveRate * numDays;
    const addCharges = additional_charges ?? booking.additional_charges;
    const disc = discount ?? booking.discount;
    const totalAmount = roomAmount + Number(addCharges) - Number(disc);
    const pendingAmount = totalAmount - booking.paid_amount;
    const paymentStatus = booking.paid_amount >= totalAmount ? 'FULLY_PAID' : booking.paid_amount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    const result = await client.query(
      `UPDATE bookings SET 
        check_in_date=$1, check_out_date=$2, num_guests=$3, room_rate=$4,
        room_amount=$5, additional_charges=$6, discount=$7, total_amount=$8,
        pending_amount=$9, payment_status=$10, num_days=$11, special_requests=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [newCheckIn, newCheckOut, num_guests || booking.num_guests, effectiveRate,
       roomAmount, addCharges, disc, totalAmount, pendingAmount, paymentStatus, numDays,
       special_requests || booking.special_requests, booking.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  } finally {
    client.release();
  }
};

export const checkIn = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const result = await client.query(
      `SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE (b.id=$1 OR b.booking_id=$1) AND b.is_deleted=false`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = result.rows[0];

    if (booking.booking_status !== 'CONFIRMED') {
      res.status(400).json({ success: false, message: `Cannot check in. Booking status is ${booking.booking_status}` });
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE bookings SET booking_status='CHECKED_IN', actual_check_in=NOW(), checked_in_by=$1, updated_at=NOW() WHERE id=$2`,
      [req.user?.id, booking.id]
    );
    await client.query(`UPDATE rooms SET status='OCCUPIED', updated_at=NOW() WHERE id=$1`, [booking.room_id]);
    await client.query(
      `INSERT INTO room_status_history (room_id, old_status, new_status, changed_by, reason)
       VALUES ($1, 'BOOKED', 'OCCUPIED', $2, 'Check-in for booking ' || $3)`,
      [booking.room_id, req.user?.id, booking.booking_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Check-in successful for Room ${booking.room_number}` });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Check-in failed' });
  } finally {
    client.release();
  }
};

export const checkOut = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { additional_charges, discount } = req.body;

    const result = await client.query(
      `SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE (b.id=$1 OR b.booking_id=$1) AND b.is_deleted=false`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = result.rows[0];

    if (booking.booking_status !== 'CHECKED_IN') {
      res.status(400).json({ success: false, message: 'Booking is not checked in' });
      await client.query('ROLLBACK');
      return;
    }

    // Recalculate with any additional charges
    let totalAmount = booking.total_amount;
    if (additional_charges !== undefined) {
      totalAmount = booking.room_amount + Number(additional_charges) - (discount ?? booking.discount);
    }
    const pendingAmount = totalAmount - booking.paid_amount;

    await client.query(
      `UPDATE bookings SET booking_status='CHECKED_OUT', actual_check_out=NOW(), checked_out_by=$1,
       total_amount=$2, pending_amount=$3, payment_status=$4, updated_at=NOW()
       WHERE id=$5`,
      [
        req.user?.id, totalAmount, pendingAmount,
        pendingAmount <= 0 ? 'FULLY_PAID' : booking.paid_amount > 0 ? 'PARTIALLY_PAID' : 'PENDING',
        booking.id
      ]
    );
    await client.query(`UPDATE rooms SET status='CLEANING', updated_at=NOW() WHERE id=$1`, [booking.room_id]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Checkout successful for Room ${booking.room_number}`,
      data: { pending_amount: pendingAmount, total_amount: totalAmount },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Checkout failed' });
  } finally {
    client.release();
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { reason, cancellation_charges = 0, refund_amount = 0 } = req.body;

    const result = await client.query(
      `SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE (b.id=$1 OR b.booking_id=$1) AND b.is_deleted=false`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = result.rows[0];

    if (['CANCELLED', 'CHECKED_OUT'].includes(booking.booking_status)) {
      res.status(400).json({ success: false, message: `Booking is already ${booking.booking_status}` });
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE bookings SET 
        booking_status='CANCELLED', cancellation_date=NOW(),
        cancellation_reason=$1, cancellation_charges=$2, refund_amount=$3,
        cancelled_by=$4, updated_at=NOW()
       WHERE id=$5`,
      [reason, cancellation_charges, refund_amount, req.user?.id, booking.id]
    );

    // Check if room has other active bookings before making available
    const otherBookings = await client.query(
      `SELECT id FROM bookings WHERE room_id=$1 AND id!=$2
       AND booking_status NOT IN ('CANCELLED','CHECKED_OUT') AND is_deleted=false`,
      [booking.room_id, booking.id]
    );

    if (otherBookings.rows.length === 0) {
      await client.query(`UPDATE rooms SET status='AVAILABLE', updated_at=NOW() WHERE id=$1`, [booking.room_id]);
    }

    // Record refund if applicable
    if (Number(refund_amount) > 0) {
      await client.query(
        `INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_type, collected_by, notes)
         VALUES ($1,$2,$3,'CASH','REFUND',$4,'Cancellation refund')`,
        [booking.id, booking.customer_id, refund_amount, req.user?.id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
};

export const extendBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { new_check_out_date } = req.body;

    const result = await client.query(
      `SELECT * FROM bookings WHERE (id=$1 OR booking_id=$1) AND is_deleted=false`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = result.rows[0];

    // Check no overlap for the extended period
    const overlap = await client.query(
      `SELECT booking_id FROM bookings
       WHERE room_id=$1 AND id!=$2 AND booking_status NOT IN ('CANCELLED','CHECKED_OUT')
       AND is_deleted=false AND check_in_date < $3 AND check_out_date > $4`,
      [booking.room_id, booking.id, new_check_out_date, booking.check_out_date]
    );
    if (overlap.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Room is booked for the extended period' });
      await client.query('ROLLBACK');
      return;
    }

    const newNumDays = differenceInDays(parseISO(new_check_out_date), parseISO(booking.check_in_date));
    const newRoomAmount = booking.room_rate * newNumDays;
    const newTotal = newRoomAmount + Number(booking.additional_charges) - Number(booking.discount);
    const newPending = newTotal - booking.paid_amount;

    await client.query(
      `UPDATE bookings SET check_out_date=$1, num_days=$2, room_amount=$3, total_amount=$4,
       pending_amount=$5, payment_status=$6, updated_at=NOW() WHERE id=$7`,
      [
        new_check_out_date, newNumDays, newRoomAmount, newTotal, newPending,
        newPending <= 0 ? 'FULLY_PAID' : 'PARTIALLY_PAID',
        booking.id
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Booking extended', data: { new_check_out_date, num_days: newNumDays, total_amount: newTotal } });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to extend booking' });
  } finally {
    client.release();
  }
};

export const getCalendarView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year as string) || new Date().getFullYear();
    const targetMonth = parseInt(month as string) || (new Date().getMonth() + 1);

    const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT b.booking_id, b.check_in_date, b.check_out_date, b.booking_status,
              c.name as customer_name, r.room_number, f.floor_number
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN rooms r ON b.room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.is_deleted = false
         AND b.booking_status NOT IN ('CANCELLED')
         AND b.check_in_date <= $2
         AND b.check_out_date >= $1
       ORDER BY r.room_number, b.check_in_date`,
      [startDate, endDate]
    );

    res.json({ success: true, data: result.rows, meta: { year: targetYear, month: targetMonth, startDate, endDate } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get calendar view' });
  }
};
