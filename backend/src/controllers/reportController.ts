import { Request, Response } from 'express';
import pool from '../config/database';

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7); // YYYY-MM

    // Room stats
    const roomStats = await pool.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available,
        COUNT(*) FILTER (WHERE status = 'BOOKED') as booked,
        COUNT(*) FILTER (WHERE status = 'OCCUPIED') as occupied,
        COUNT(*) FILTER (WHERE status = 'CLEANING') as cleaning,
        COUNT(*) FILTER (WHERE status = 'MAINTENANCE') as maintenance,
        COUNT(*) FILTER (WHERE status = 'CHECK_IN_TODAY') as check_in_today,
        COUNT(*) FILTER (WHERE status = 'CHECK_OUT_TODAY') as check_out_today
      FROM rooms WHERE is_active = true
    `);

    // Today's bookings
    const todayCheckins = await pool.query(
      `SELECT COUNT(*) as count FROM bookings WHERE check_in_date = $1 AND booking_status NOT IN ('CANCELLED') AND is_deleted=false`,
      [today]
    );
    const todayCheckouts = await pool.query(
      `SELECT COUNT(*) as count FROM bookings WHERE check_out_date = $1 AND booking_status NOT IN ('CANCELLED','CHECKED_OUT') AND is_deleted=false`,
      [today]
    );

    // Today's revenue (payments received today)
    const todayRevenue = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) as total
       FROM payments p JOIN bookings b ON p.booking_id = b.id
       WHERE p.payment_date::date = $1 AND p.payment_type != 'REFUND' AND p.is_deleted=false`,
      [today]
    );

    // Monthly revenue
    const monthlyRevenue = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) as total
       FROM payments p JOIN bookings b ON p.booking_id = b.id
       WHERE TO_CHAR(p.payment_date, 'YYYY-MM') = $1 AND p.payment_type != 'REFUND' AND p.is_deleted=false`,
      [thisMonth]
    );

    // Monthly expenses
    const monthlyExpenses = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE TO_CHAR(expense_date,'YYYY-MM')=$1 AND is_deleted=false`,
      [thisMonth]
    );

    // Pending payments
    const pendingPayments = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(pending_amount),0) as total
       FROM bookings WHERE payment_status != 'FULLY_PAID' AND booking_status NOT IN ('CANCELLED') AND is_deleted=false AND pending_amount > 0`
    );

    // Recent bookings
    const recentBookings = await pool.query(
      `SELECT b.booking_id, b.check_in_date, b.check_out_date, b.booking_status, b.payment_status,
              b.total_amount, b.pending_amount, c.name as customer_name, r.room_number
       FROM bookings b JOIN customers c ON b.customer_id=c.id JOIN rooms r ON b.room_id=r.id
       WHERE b.is_deleted=false ORDER BY b.created_at DESC LIMIT 5`
    );

    // Revenue by payment method (this month)
    const revenueByMethod = await pool.query(
      `SELECT p.payment_method, COALESCE(SUM(p.amount),0) as total
       FROM payments p WHERE TO_CHAR(p.payment_date,'YYYY-MM')=$1 AND p.payment_type!='REFUND' AND p.is_deleted=false
       GROUP BY p.payment_method`,
      [thisMonth]
    );

    const revenue = parseFloat(monthlyRevenue.rows[0].total);
    const expenses = parseFloat(monthlyExpenses.rows[0].total);

    res.json({
      success: true,
      data: {
        rooms: roomStats.rows[0],
        today_checkins: parseInt(todayCheckins.rows[0].count),
        today_checkouts: parseInt(todayCheckouts.rows[0].count),
        today_revenue: parseFloat(todayRevenue.rows[0].total),
        monthly_revenue: revenue,
        monthly_expenses: expenses,
        monthly_profit: revenue - expenses,
        pending_payments: {
          count: parseInt(pendingPayments.rows[0].count),
          total: parseFloat(pendingPayments.rows[0].total),
        },
        recent_bookings: recentBookings.rows,
        revenue_by_method: revenueByMethod.rows,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get dashboard data' });
  }
};

export const getMonthlyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;

    // Revenue
    const revenueResult = await pool.query(
      `SELECT 
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type!='REFUND'),0) as total_received,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type='REFUND'),0) as total_refunds,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method='CASH' AND p.payment_type!='REFUND'),0) as cash,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method='UPI' AND p.payment_type!='REFUND'),0) as upi,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method='CARD' AND p.payment_type!='REFUND'),0) as card,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method='ONLINE' AND p.payment_type!='REFUND'),0) as online,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method='BANK_TRANSFER' AND p.payment_type!='REFUND'),0) as bank_transfer
       FROM payments p
       WHERE TO_CHAR(p.payment_date,'YYYY-MM')=$1 AND p.is_deleted=false`,
      [monthStr]
    );

    // Bookings stats
    const bookingStats = await pool.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(num_days),0) as total_room_nights,
        COALESCE(SUM(total_amount),0) as total_booking_amount,
        COALESCE(SUM(pending_amount),0) as total_pending,
        COUNT(*) FILTER (WHERE booking_source='ONLINE') as online_bookings,
        COUNT(*) FILTER (WHERE booking_source='WALK_IN') as walkin_bookings,
        COUNT(*) FILTER (WHERE booking_source='PHONE') as phone_bookings
       FROM bookings
       WHERE TO_CHAR(check_in_date,'YYYY-MM')=$1 AND booking_status!='CANCELLED' AND is_deleted=false`,
      [monthStr]
    );

    // Expenses by category
    const expenseResult = await pool.query(
      `SELECT ec.name as category, COALESCE(SUM(e.amount),0) as total
       FROM expenses e JOIN expense_categories ec ON e.category_id=ec.id
       WHERE TO_CHAR(e.expense_date,'YYYY-MM')=$1 AND e.is_deleted=false
       GROUP BY ec.name ORDER BY total DESC`,
      [monthStr]
    );

    const totalExpenses = expenseResult.rows.reduce((sum: number, r: any) => sum + parseFloat(r.total), 0);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_received);

    // Days in month for occupancy calc
    const daysInMonth = new Date(parseInt(targetYear as string), parseInt(targetMonth as string), 0).getDate();
    const totalRoomNights = 30 * daysInMonth; // 30 rooms
    const occupiedNights = parseInt(bookingStats.rows[0].total_room_nights);
    const occupancyPct = totalRoomNights > 0 ? ((occupiedNights / totalRoomNights) * 100).toFixed(1) : '0';

    // Salary expenses
    const salaryResult = await pool.query(
      `SELECT COALESCE(SUM(net_amount),0) as total FROM salary_payments WHERE payment_month=$1`,
      [monthStr]
    );

    res.json({
      success: true,
      data: {
        month: monthStr,
        revenue: revenueResult.rows[0],
        bookings: bookingStats.rows[0],
        expenses_by_category: expenseResult.rows,
        total_expenses: totalExpenses,
        total_salary: parseFloat(salaryResult.rows[0].total),
        net_profit: totalRevenue - totalExpenses,
        occupancy: {
          percentage: occupancyPct,
          occupied_nights: occupiedNights,
          total_nights: totalRoomNights,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get monthly report' });
  }
};

export const getYearlyRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    const result = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM p.payment_date) as month,
        TO_CHAR(p.payment_date,'Mon') as month_name,
        COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type!='REFUND'),0) as revenue
       FROM payments p
       WHERE EXTRACT(YEAR FROM p.payment_date)=$1 AND p.is_deleted=false
       GROUP BY EXTRACT(MONTH FROM p.payment_date), TO_CHAR(p.payment_date,'Mon')
       ORDER BY month`,
      [targetYear]
    );

    const expResult = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM expense_date) as month,
        COALESCE(SUM(amount),0) as expenses
       FROM expenses
       WHERE EXTRACT(YEAR FROM expense_date)=$1 AND is_deleted=false
       GROUP BY EXTRACT(MONTH FROM expense_date)
       ORDER BY month`,
      [targetYear]
    );

    res.json({ success: true, data: { revenue: result.rows, expenses: expResult.rows, year: targetYear } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get yearly revenue' });
  }
};

export const getOccupancyReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
    const daysInMonth = new Date(parseInt(targetYear as string), parseInt(targetMonth as string), 0).getDate();

    const result = await pool.query(
      `SELECT 
        f.floor_number,
        COUNT(DISTINCT r.id) as total_rooms,
        COALESCE(SUM(b.num_days),0) as occupied_nights
       FROM floors f
       JOIN rooms r ON r.floor_id=f.id
       LEFT JOIN bookings b ON b.room_id=r.id AND TO_CHAR(b.check_in_date,'YYYY-MM')=$1
         AND b.booking_status NOT IN ('CANCELLED') AND b.is_deleted=false
       WHERE r.is_active=true
       GROUP BY f.floor_number ORDER BY f.floor_number`,
      [monthStr]
    );

    const data = result.rows.map(row => ({
      ...row,
      total_nights: parseInt(row.total_rooms) * daysInMonth,
      occupancy_pct: ((parseInt(row.occupied_nights) / (parseInt(row.total_rooms) * daysInMonth)) * 100).toFixed(1),
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get occupancy report' });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const result = await pool.query(
      `SELECT al.*, u.name as user_name FROM audit_logs al
       LEFT JOIN users u ON al.user_id=u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limitNum, (pageNum - 1) * limitNum]
    );
    const total = await pool.query(`SELECT COUNT(*) FROM audit_logs`);
    res.json({ success: true, data: result.rows, pagination: { total: parseInt(total.rows[0].count), page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get audit logs' });
  }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
};

export const markNotificationRead = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE notifications SET is_read=true, read_by=$1 WHERE id=$2`, [req.user?.id, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
};

export const getBookingSourceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;

    const result = await pool.query(
      `SELECT booking_source, COUNT(*) as count, COALESCE(SUM(total_amount),0) as total_amount
       FROM bookings WHERE TO_CHAR(check_in_date,'YYYY-MM')=$1 AND booking_status!='CANCELLED' AND is_deleted=false
       GROUP BY booking_source`,
      [monthStr]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get booking source stats' });
  }
};
