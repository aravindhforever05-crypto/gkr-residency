import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const addPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { booking_id, amount, payment_method, payment_type, transaction_reference, notes } = req.body;

    const bookingResult = await client.query(
      `SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE (b.id=$1 OR b.booking_id=$1) AND b.is_deleted=false`,
      [booking_id]
    );
    if (bookingResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      await client.query('ROLLBACK');
      return;
    }
    const booking = bookingResult.rows[0];

    const paymentResult = await client.query(
      `INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_type, transaction_reference, notes, collected_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [booking.id, booking.customer_id, amount, payment_method, payment_type, transaction_reference, notes, req.user?.id]
    );

    // Update booking paid/pending amounts
    const newPaid = Number(booking.paid_amount) + Number(amount);
    const newPending = Number(booking.total_amount) - newPaid;
    const paymentStatus = newPending <= 0 ? 'FULLY_PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    await client.query(
      `UPDATE bookings SET paid_amount=$1, pending_amount=$2, payment_status=$3, updated_at=NOW() WHERE id=$4`,
      [newPaid, Math.max(0, newPending), paymentStatus, booking.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: paymentResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to add payment' });
  } finally {
    client.release();
  }
};

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { booking_id, customer_id, payment_method, from_date, to_date, page = '1', limit = '20' } = req.query;

    let query = `
      SELECT p.*, b.booking_id as booking_ref, c.name as customer_name, r.room_number, u.name as collected_by_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN customers c ON p.customer_id = c.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON p.collected_by = u.id
      WHERE p.is_deleted = false
    `;
    const params: any[] = [];

    if (booking_id) {
      params.push(booking_id);
      query += ` AND (b.id=$${params.length} OR b.booking_id=$${params.length})`;
    }
    if (customer_id) {
      params.push(customer_id);
      query += ` AND p.customer_id=$${params.length}`;
    }
    if (payment_method) {
      params.push(payment_method);
      query += ` AND p.payment_method=$${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND p.payment_date::date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND p.payment_date::date <= $${params.length}`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) s`, params);
    const total = parseInt(countResult.rows[0].count);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    params.push(limitNum, (pageNum - 1) * limitNum);
    query += ` ORDER BY p.payment_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payments' });
  }
};

export const getPendingPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT b.booking_id, b.pending_amount, b.total_amount, b.paid_amount, b.payment_status,
              b.check_in_date, b.check_out_date, c.name as customer_name, c.mobile,
              r.room_number, f.floor_number
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN rooms r ON b.room_id = r.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.payment_status != 'FULLY_PAID'
         AND b.booking_status NOT IN ('CANCELLED')
         AND b.is_deleted = false
         AND b.pending_amount > 0
       ORDER BY b.pending_amount DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get pending payments' });
  }
};
