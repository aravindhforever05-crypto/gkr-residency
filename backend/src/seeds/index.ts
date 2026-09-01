import pool from '../config/database';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export const runSeeds = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    logger.info('Running database seeds...');

    // Seed roles
    await client.query(`
      INSERT INTO roles (name, description, permissions) VALUES
        ('SUPER_ADMIN', 'Full access to all features', '{"all": true}'),
        ('MANAGER', 'Access to rooms, bookings, customers, payments, reports, expenses', '{"rooms":true,"bookings":true,"customers":true,"payments":true,"reports":true,"expenses":true}'),
        ('RECEPTIONIST', 'Access to bookings, customers, check-in/out, payments', '{"bookings":true,"customers":true,"checkin":true,"checkout":true,"payments":true}'),
        ('ACCOUNTANT', 'Access to payments, expenses, revenue, reports', '{"payments":true,"expenses":true,"revenue":true,"reports":true}')
      ON CONFLICT (name) DO NOTHING
    `);

    // Seed admin user
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const adminRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'SUPER_ADMIN'`);
    const managerRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'MANAGER'`);
    const receptionistRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'RECEPTIONIST'`);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role_id, phone) VALUES
        ('Admin Owner', 'admin@gkr.com', $1, $2, '9876543210'),
        ('Ravi Manager', 'manager@gkr.com', $1, $3, '9876543211'),
        ('Priya Reception', 'receptionist@gkr.com', $1, $4, '9876543212')
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash, adminRoleRes.rows[0].id, managerRoleRes.rows[0].id, receptionistRoleRes.rows[0].id]);

    // Seed floors
    await client.query(`
      INSERT INTO floors (floor_number, name) VALUES
        (1, 'Ground Floor'),
        (2, 'First Floor'),
        (3, 'Second Floor')
      ON CONFLICT (floor_number) DO NOTHING
    `);

    const floorsRes = await client.query(`SELECT id, floor_number FROM floors ORDER BY floor_number`);
    const floors = floorsRes.rows;

    // Seed rooms for each floor
    const roomPrices: Record<number, { min: number; max: number }> = {
      1: { min: 1500, max: 2000 },
      2: { min: 2000, max: 2500 },
      3: { min: 2500, max: 3500 },
    };

    for (const floor of floors) {
      const prices = roomPrices[floor.floor_number];
      for (let i = 1; i <= 10; i++) {
        const roomNum = `${floor.floor_number}${i.toString().padStart(2, '0')}`;
        // Vary prices slightly
        const priceStep = (prices.max - prices.min) / 9;
        const price = Math.round(prices.min + priceStep * (i - 1));
        const type = i <= 3 ? 'Standard' : i <= 7 ? 'Deluxe' : 'Suite';
        await client.query(`
          INSERT INTO rooms (room_number, floor_id, room_type, base_price, capacity, amenities)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (room_number) DO NOTHING
        `, [roomNum, floor.id, type, price, type === 'Suite' ? 4 : 2, JSON.stringify(['AC', 'TV', 'WiFi'])]);
      }
    }

    // Seed expense categories
    await client.query(`
      INSERT INTO expense_categories (name) VALUES
        ('Water Bill'), ('Electricity Bill'), ('Labour Salary'), ('Staff Salary'),
        ('Cleaning'), ('Maintenance'), ('Internet'), ('Gas'), ('Laundry'),
        ('Repairs'), ('Property Rent'), ('Supplies'), ('Other')
      ON CONFLICT (name) DO NOTHING
    `);

    // Seed sample customers
    const custResult = await client.query(`
      INSERT INTO customers (name, mobile, email, address, id_proof_type, id_proof_number)
      VALUES
        ('Aravindh Kumar', '9811111111', 'aravindh@email.com', '12 Anna Nagar, Chennai', 'AADHAAR', '1234-5678-9012'),
        ('Meena Sundaram', '9822222222', 'meena@email.com', '45 T Nagar, Chennai', 'PASSPORT', 'P1234567'),
        ('Karthik Raja', '9833333333', 'karthik@email.com', '78 Velachery, Chennai', 'DRIVING_LICENSE', 'TN0120230012345'),
        ('Lakshmi Priya', '9844444444', 'lakshmi@email.com', '23 Adyar, Chennai', 'VOTER_ID', 'TN/12/345/678901'),
        ('Vijay Anand', '9855555555', 'vijay@email.com', '56 Guindy, Chennai', 'AADHAAR', '9876-5432-1098'),
        ('Nithya Devi', '9866666666', 'nithya@email.com', '89 Mylapore, Chennai', 'AADHAAR', '1111-2222-3333'),
        ('Suresh Babu', '9877777777', 'suresh@email.com', '34 Tambaram, Chennai', 'PASSPORT', 'P9876543'),
        ('Kavitha Raj', '9888888888', 'kavitha@email.com', '67 Porur, Chennai', 'AADHAAR', '4444-5555-6666')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    // Get rooms
    const roomsRes = await client.query(`SELECT id, room_number FROM rooms ORDER BY room_number`);
    const rooms = roomsRes.rows;
    const adminUserRes = await client.query(`SELECT id FROM users WHERE email = 'admin@gkr.com'`);
    const adminId = adminUserRes.rows[0].id;

    // Create some sample bookings
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();

    // Helper to format date
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const addDays = (d: Date, n: number) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + n);
      return nd;
    };

    // Past bookings (checked out) for report data
    const pastBookings = [
      { custIdx: 0, roomIdx: 0, startOffset: -20, days: 3, rate: 1500, advance: 2000, source: 'WALK_IN' },
      { custIdx: 1, roomIdx: 2, startOffset: -15, days: 2, rate: 1700, advance: 1500, source: 'PHONE' },
      { custIdx: 2, roomIdx: 5, startOffset: -12, days: 4, rate: 2000, advance: 3000, source: 'ONLINE' },
      { custIdx: 3, roomIdx: 10, startOffset: -10, days: 3, rate: 2200, advance: 2000, source: 'WALK_IN' },
      { custIdx: 4, roomIdx: 15, startOffset: -8, days: 2, rate: 2500, advance: 2000, source: 'PHONE' },
      { custIdx: 5, roomIdx: 20, startOffset: -7, days: 5, rate: 2800, advance: 5000, source: 'ONLINE' },
      { custIdx: 6, roomIdx: 25, startOffset: -5, days: 2, rate: 3000, advance: 2500, source: 'WALK_IN' },
      { custIdx: 7, roomIdx: 28, startOffset: -3, days: 3, rate: 3200, advance: 3000, source: 'WEBSITE' },
    ];

    // Current/future bookings
    const currentBookings = [
      { custIdx: 0, roomIdx: 1, startOffset: -2, days: 5, rate: 1600, advance: 2000, source: 'WALK_IN', status: 'CHECKED_IN' },
      { custIdx: 1, roomIdx: 3, startOffset: -1, days: 3, rate: 1800, advance: 1800, source: 'PHONE', status: 'CHECKED_IN' },
      { custIdx: 2, roomIdx: 7, startOffset: 0, days: 4, rate: 2000, advance: 2000, source: 'ONLINE', status: 'CONFIRMED' },
      { custIdx: 3, roomIdx: 11, startOffset: -3, days: 4, rate: 2200, advance: 2200, source: 'WALK_IN', status: 'CHECKED_IN' },
      { custIdx: 4, roomIdx: 13, startOffset: 1, days: 3, rate: 2400, advance: 2400, source: 'PHONE', status: 'CONFIRMED' },
      { custIdx: 5, roomIdx: 18, startOffset: 0, days: 2, rate: 2600, advance: 2000, source: 'WALK_IN', status: 'CONFIRMED' },
      { custIdx: 6, roomIdx: 22, startOffset: -1, days: 6, rate: 2800, advance: 5000, source: 'ONLINE', status: 'CHECKED_IN' },
      { custIdx: 7, roomIdx: 27, startOffset: 0, days: 3, rate: 3200, advance: 3200, source: 'WEBSITE', status: 'CONFIRMED' },
    ];

    let bookingCounter = 1;

    const createBooking = async (b: any, status: string) => {
      const cust = custResult.rows[b.custIdx % custResult.rows.length];
      const room = rooms[b.roomIdx % rooms.length];
      const checkIn = addDays(today, b.startOffset);
      const checkOut = addDays(checkIn, b.days);
      const total = b.rate * b.days;
      const pending = total - b.advance;
      const payStatus = pending <= 0 ? 'FULLY_PAID' : b.advance > 0 ? 'PARTIALLY_PAID' : 'PENDING';
      const bookingId = `GKR-${thisYear}${thisMonth.toString().padStart(2, '0')}-${bookingCounter.toString().padStart(3, '0')}`;
      bookingCounter++;

      const bRes = await client.query(`
        INSERT INTO bookings (
          booking_id, customer_id, room_id, check_in_date, check_out_date,
          num_guests, num_days, room_rate, room_amount, total_amount,
          paid_amount, pending_amount, payment_status, booking_status, booking_source, created_by,
          actual_check_in
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (booking_id) DO NOTHING
        RETURNING id
      `, [
        bookingId, cust.id, room.id, fmt(checkIn), fmt(checkOut),
        2, b.days, b.rate, total, total,
        b.advance, Math.max(0, pending), payStatus, status, b.source, adminId,
        status === 'CHECKED_IN' ? checkIn.toISOString() : null
      ]);

      if (bRes.rows.length > 0 && b.advance > 0) {
        await client.query(`
          INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_type, collected_by)
          VALUES ($1,$2,$3,'CASH','ADVANCE',$4)
        `, [bRes.rows[0].id, cust.id, b.advance, adminId]);
      }

      // Update room status for current checked-in bookings
      if (status === 'CHECKED_IN') {
        await client.query(`UPDATE rooms SET status = 'OCCUPIED' WHERE id = $1`, [room.id]);
      } else if (status === 'CONFIRMED' && b.startOffset === 0) {
        await client.query(`UPDATE rooms SET status = 'CHECK_IN_TODAY' WHERE id = $1`, [room.id]);
      }
    };

    for (const b of pastBookings) {
      await createBooking(b, 'CHECKED_OUT');
    }
    for (const b of currentBookings) {
      await createBooking(b, b.status);
    }

    // Seed sample expenses for this month
    const expCatRes = await client.query(`SELECT id, name FROM expense_categories`);
    const expCats = expCatRes.rows;
    const getCatId = (name: string) => expCats.find(c => c.name === name)?.id;

    const sampleExpenses = [
      { cat: 'Water Bill', desc: 'Monthly water bill', amount: 8000, date: fmt(addDays(today, -25)) },
      { cat: 'Electricity Bill', desc: 'Monthly electricity', amount: 15000, date: fmt(addDays(today, -24)) },
      { cat: 'Cleaning', desc: 'Cleaning supplies', amount: 8000, date: fmt(addDays(today, -20)) },
      { cat: 'Maintenance', desc: 'General maintenance', amount: 6500, date: fmt(addDays(today, -15)) },
      { cat: 'Internet', desc: 'Broadband bill', amount: 2500, date: fmt(addDays(today, -10)) },
      { cat: 'Supplies', desc: 'Toiletries and supplies', amount: 5000, date: fmt(addDays(today, -5)) },
    ];

    for (const exp of sampleExpenses) {
      await client.query(`
        INSERT INTO expenses (category_id, expense_date, description, amount, payment_method, created_by)
        VALUES ($1, $2, $3, $4, 'CASH', $5)
      `, [getCatId(exp.cat), exp.date, exp.desc, exp.amount, adminId]);
    }

    // Seed employees
    const empResult = await client.query(`
      INSERT INTO employees (name, role, monthly_salary, phone, joining_date) VALUES
        ('Ramesh Kumar', 'Housekeeper', 18000, '9900000001', '2024-01-01'),
        ('Suresh Raj', 'Receptionist', 20000, '9900000002', '2024-02-01'),
        ('Kavitha M', 'Cleaner', 15000, '9900000003', '2024-03-01'),
        ('Murugan S', 'Security', 17000, '9900000004', '2024-01-15')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    // Add salary payments for employees
    for (const emp of empResult.rows) {
      const empData = await client.query(`SELECT monthly_salary FROM employees WHERE id = $1`, [emp.id]);
      const salary = empData.rows[0]?.monthly_salary || 18000;
      await client.query(`
        INSERT INTO salary_payments (employee_id, payment_month, salary_amount, net_amount, payment_date, payment_method, paid_by)
        VALUES ($1, $2, $3, $3, $4, 'CASH', $5)
        ON CONFLICT DO NOTHING
      `, [emp.id, `${thisYear}-${(thisMonth - 1 || 12).toString().padStart(2, '0')}`, salary, fmt(addDays(today, -5)), adminId]);
    }

    // Seed water bill
    await client.query(`
      INSERT INTO water_bills (billing_month, bill_date, bill_amount, payment_status, created_by)
      VALUES ($1, $2, 8000, 'PAID', $3)
      ON CONFLICT DO NOTHING
    `, [`${thisYear}-${thisMonth.toString().padStart(2, '0')}`, fmt(addDays(today, -20)), adminId]);

    await client.query('COMMIT');
    logger.info('Seeds completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}
