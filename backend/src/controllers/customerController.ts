import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    let query = `SELECT * FROM customers WHERE is_active = true`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $1 OR mobile ILIKE $1 OR email ILIKE $1)`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) s`, params);
    const total = parseInt(countResult.rows[0].count);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    params.push(limitNum, (pageNum - 1) * limitNum);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get customers' });
  }
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM customers WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    // Get booking history (hide sensitive ID proof in listing)
    const bookings = await pool.query(
      `SELECT b.booking_id, b.check_in_date, b.check_out_date, b.num_days, b.total_amount,
              b.paid_amount, b.pending_amount, b.payment_status, b.booking_status, b.booking_source,
              r.room_number, f.floor_number
       FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN floors f ON r.floor_id = f.id
       WHERE b.customer_id = $1 AND b.is_deleted = false ORDER BY b.created_at DESC`,
      [id]
    );

    // Mask ID proof number
    const customer = result.rows[0];
    const masked = customer.id_proof_number
      ? customer.id_proof_number.replace(/.(?=.{4})/g, '*')
      : null;

    res.json({ success: true, data: { ...customer, id_proof_number: masked, bookings: bookings.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get customer' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, mobile, email, address, id_proof_type, id_proof_number } = req.body;

    if (!name || !mobile) {
      res.status(400).json({ success: false, message: 'Name and mobile are required' });
      return;
    }

    // Check if customer with same mobile exists
    const existing = await pool.query(`SELECT id FROM customers WHERE mobile = $1`, [mobile]);
    if (existing.rows.length > 0) {
      res.json({ success: true, data: existing.rows[0], message: 'Existing customer found' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO customers (name, mobile, email, address, id_proof_type, id_proof_number)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, mobile, email, address, id_proof_type, id_proof_number]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create customer' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, mobile, email, address, id_proof_type, id_proof_number } = req.body;
    const result = await pool.query(
      `UPDATE customers SET
        name=COALESCE($1,name), mobile=COALESCE($2,mobile), email=COALESCE($3,email),
        address=COALESCE($4,address), id_proof_type=COALESCE($5,id_proof_type),
        id_proof_number=COALESCE($6,id_proof_number), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, mobile, email, address, id_proof_type, id_proof_number, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update customer' });
  }
};
