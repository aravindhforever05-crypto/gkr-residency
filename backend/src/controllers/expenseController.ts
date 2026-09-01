import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id, from_date, to_date, page = '1', limit = '20' } = req.query;

    let query = `
      SELECT e.*, ec.name as category_name, u.name as created_by_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.is_deleted = false
    `;
    const params: any[] = [];

    if (category_id) {
      params.push(category_id);
      query += ` AND e.category_id=$${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND e.expense_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND e.expense_date <= $${params.length}`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) s`, params);
    const total = parseInt(countResult.rows[0].count);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    params.push(limitNum, (pageNum - 1) * limitNum);
    query += ` ORDER BY e.expense_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get expenses' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category_id, expense_date, description, amount, payment_method, paid_to, invoice_number, notes } = req.body;

    if (!category_id || !expense_date || !description || !amount) {
      res.status(400).json({ success: false, message: 'Category, date, description, and amount are required' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO expenses (category_id, expense_date, description, amount, payment_method, paid_to, invoice_number, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [category_id, expense_date, description, amount, payment_method, paid_to, invoice_number, notes, req.user?.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { category_id, expense_date, description, amount, payment_method, paid_to, notes } = req.body;
    const result = await pool.query(
      `UPDATE expenses SET
        category_id=COALESCE($1,category_id), expense_date=COALESCE($2,expense_date),
        description=COALESCE($3,description), amount=COALESCE($4,amount),
        payment_method=COALESCE($5,payment_method), paid_to=COALESCE($6,paid_to),
        notes=COALESCE($7,notes), updated_at=NOW()
       WHERE id=$8 AND is_deleted=false RETURNING *`,
      [category_id, expense_date, description, amount, payment_method, paid_to, notes, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE expenses SET is_deleted=true, updated_at=NOW() WHERE id=$1`, [id]);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

export const getExpenseCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM expense_categories WHERE is_active=true ORDER BY name`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
};

// Employees
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM employees WHERE is_active=true ORDER BY name`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get employees' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, monthly_salary, phone, email, address, joining_date } = req.body;
    const result = await pool.query(
      `INSERT INTO employees (name, role, monthly_salary, phone, email, address, joining_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, role, monthly_salary, phone, email, address, joining_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, monthly_salary, phone, email, address, is_active } = req.body;
    const result = await pool.query(
      `UPDATE employees SET
        name=COALESCE($1,name), role=COALESCE($2,role), monthly_salary=COALESCE($3,monthly_salary),
        phone=COALESCE($4,phone), email=COALESCE($5,email), address=COALESCE($6,address),
        is_active=COALESCE($7,is_active), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, role, monthly_salary, phone, email, address, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
};

// Salary payments
export const getSalaryPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.query;
    let query = `
      SELECT sp.*, e.name as employee_name, e.role, u.name as paid_by_name
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      LEFT JOIN users u ON sp.paid_by = u.id
    `;
    const params: any[] = [];
    if (month) {
      params.push(month);
      query += ` WHERE sp.payment_month=$1`;
    }
    query += ` ORDER BY sp.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get salary payments' });
  }
};

export const addSalaryPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employee_id, payment_month, salary_amount, advance_deduction, other_deductions, bonus, payment_date, payment_method, transaction_reference, notes } = req.body;
    const net = Number(salary_amount) + Number(bonus || 0) - Number(advance_deduction || 0) - Number(other_deductions || 0);
    const result = await pool.query(
      `INSERT INTO salary_payments (employee_id, payment_month, salary_amount, advance_deduction, other_deductions, bonus, net_amount, payment_date, payment_method, transaction_reference, notes, paid_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [employee_id, payment_month, salary_amount, advance_deduction || 0, other_deductions || 0, bonus || 0, net, payment_date, payment_method, transaction_reference, notes, req.user?.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add salary payment' });
  }
};

// Water bills
export const getWaterBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM water_bills ORDER BY bill_date DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get water bills' });
  }
};

export const createWaterBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { billing_month, bill_date, previous_reading, current_reading, bill_amount, paid_date, payment_method, payment_status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO water_bills (billing_month, bill_date, previous_reading, current_reading, bill_amount, paid_date, payment_method, payment_status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [billing_month, bill_date, previous_reading, current_reading, bill_amount, paid_date, payment_method, payment_status || 'PENDING', notes, req.user?.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create water bill' });
  }
};

export const updateWaterBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { payment_status, paid_date, payment_method, notes } = req.body;
    const result = await pool.query(
      `UPDATE water_bills SET 
        payment_status=COALESCE($1,payment_status), paid_date=COALESCE($2,paid_date),
        payment_method=COALESCE($3,payment_method), notes=COALESCE($4,notes), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [payment_status, paid_date, payment_method, notes, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update water bill' });
  }
};
