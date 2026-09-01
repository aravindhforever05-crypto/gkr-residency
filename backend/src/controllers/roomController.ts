import { Request, Response } from 'express';
import pool from '../config/database';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { floor, status } = req.query;
    let query = `
      SELECT r.*, f.floor_number, f.name as floor_name
      FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      WHERE r.is_active = true
    `;
    const params: any[] = [];

    if (floor) {
      params.push(floor);
      query += ` AND f.floor_number = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    query += ` ORDER BY r.room_number`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Get rooms error:', error);
    res.status(500).json({ success: false, message: 'Failed to get rooms' });
  }
};

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, f.floor_number, f.name as floor_name
       FROM rooms r JOIN floors f ON r.floor_id = f.id
       WHERE r.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    // Get current booking if occupied
    const bookingResult = await pool.query(
      `SELECT b.*, c.name as customer_name, c.mobile as customer_mobile
       FROM bookings b JOIN customers c ON b.customer_id = c.id
       WHERE b.room_id = $1 AND b.booking_status IN ('CONFIRMED','CHECKED_IN') AND b.is_deleted = false
       ORDER BY b.check_in_date DESC LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        current_booking: bookingResult.rows[0] || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get room' });
  }
};

export const updateRoomStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'CHECK_IN_TODAY', 'CHECK_OUT_TODAY', 'CLEANING', 'MAINTENANCE', 'BLOCKED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const oldResult = await pool.query(`SELECT status FROM rooms WHERE id = $1`, [id]);
    if (oldResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    await pool.query(`UPDATE rooms SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);

    // Log status change
    await pool.query(
      `INSERT INTO room_status_history (room_id, old_status, new_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, oldResult.rows[0].status, status, req.user?.id, reason || null]
    );

    res.json({ success: true, message: 'Room status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update room status' });
  }
};

export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { room_type, base_price, capacity, description, amenities } = req.body;
    const result = await pool.query(
      `UPDATE rooms SET 
        room_type=COALESCE($1,room_type),
        base_price=COALESCE($2,base_price),
        capacity=COALESCE($3,capacity),
        description=COALESCE($4,description),
        amenities=COALESCE($5,amenities),
        updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [room_type, base_price, capacity, description, amenities ? JSON.stringify(amenities) : null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update room' });
  }
};

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { check_in_date, check_out_date, floor } = req.query;

    if (!check_in_date || !check_out_date) {
      res.status(400).json({ success: false, message: 'check_in_date and check_out_date required' });
      return;
    }

    // Find rooms with no overlapping active bookings
    let query = `
      SELECT r.*, f.floor_number, f.name as floor_name
      FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      WHERE r.is_active = true
        AND r.status NOT IN ('MAINTENANCE', 'BLOCKED')
        AND r.id NOT IN (
          SELECT room_id FROM bookings
          WHERE booking_status NOT IN ('CANCELLED', 'CHECKED_OUT')
            AND is_deleted = false
            AND check_in_date < $2
            AND check_out_date > $1
        )
    `;
    const params: any[] = [check_in_date, check_out_date];

    if (floor) {
      params.push(floor);
      query += ` AND f.floor_number = $${params.length}`;
    }

    query += ` ORDER BY r.room_number`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check availability' });
  }
};

export const getRoomPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);

    const result = await pool.query(`
      SELECT 
        r.room_number,
        r.room_type,
        r.base_price,
        f.floor_number,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(b.num_days) FILTER (WHERE b.booking_status IN ('CHECKED_IN','CHECKED_OUT')), 0) as occupied_days,
        COALESCE(SUM(p.amount), 0) as total_revenue
      FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      LEFT JOIN bookings b ON b.room_id = r.id 
        AND b.is_deleted = false
        AND b.booking_status NOT IN ('CANCELLED')
        AND EXTRACT(YEAR FROM b.check_in_date) = $1
        AND EXTRACT(MONTH FROM b.check_in_date) = $2
      LEFT JOIN payments p ON p.booking_id = b.id AND p.is_deleted = false
      WHERE r.is_active = true
      GROUP BY r.id, r.room_number, r.room_type, r.base_price, f.floor_number
      ORDER BY total_revenue DESC
    `, [targetYear, targetMonth]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get room performance' });
  }
};

export const getFloors = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM floors ORDER BY floor_number`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get floors' });
  }
};
