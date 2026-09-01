import pool from '../config/database';
import logger from '../utils/logger';

const migrationSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Floors table
CREATE TABLE IF NOT EXISTS floors (
  id SERIAL PRIMARY KEY,
  floor_number INTEGER UNIQUE NOT NULL,
  name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number VARCHAR(10) UNIQUE NOT NULL,
  floor_id INTEGER REFERENCES floors(id),
  room_type VARCHAR(50) DEFAULT 'Standard',
  base_price DECIMAL(10,2) NOT NULL,
  capacity INTEGER DEFAULT 2,
  description TEXT,
  amenities JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','BOOKED','OCCUPIED','CHECK_IN_TODAY','CHECK_OUT_TODAY','CLEANING','MAINTENANCE','BLOCKED')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  id_proof_type VARCHAR(30) CHECK (id_proof_type IN ('AADHAAR','PASSPORT','DRIVING_LICENSE','VOTER_ID','OTHER')),
  id_proof_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  room_id UUID REFERENCES rooms(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  num_guests INTEGER DEFAULT 1,
  num_days INTEGER NOT NULL,
  room_rate DECIMAL(10,2) NOT NULL,
  room_amount DECIMAL(10,2) NOT NULL,
  additional_charges DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  pending_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(30) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PARTIALLY_PAID','FULLY_PAID')),
  booking_status VARCHAR(30) DEFAULT 'CONFIRMED' CHECK (booking_status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW')),
  booking_source VARCHAR(30) DEFAULT 'WALK_IN' CHECK (booking_source IN ('WALK_IN','PHONE','WEBSITE','ONLINE','OTHER')),
  special_requests TEXT,
  checked_in_by UUID REFERENCES users(id),
  checked_out_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancellation_charges DECIMAL(10,2) DEFAULT 0,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  cancelled_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH','UPI','CARD','BANK_TRANSFER','ONLINE','OTHER')),
  payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('ADVANCE','PARTIAL','FULL','FINAL','REFUND')),
  transaction_reference VARCHAR(100),
  notes TEXT,
  collected_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id INTEGER REFERENCES expense_categories(id),
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(30) CHECK (payment_method IN ('CASH','UPI','CARD','BANK_TRANSFER','OTHER')),
  paid_to VARCHAR(100),
  invoice_number VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  monthly_salary DECIMAL(10,2) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  joining_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary payments table
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  payment_month VARCHAR(7) NOT NULL,
  salary_amount DECIMAL(10,2) NOT NULL,
  advance_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  bonus DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(30) CHECK (payment_method IN ('CASH','UPI','CARD','BANK_TRANSFER','OTHER')),
  transaction_reference VARCHAR(100),
  notes TEXT,
  paid_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water bills table
CREATE TABLE IF NOT EXISTS water_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  billing_month VARCHAR(7) NOT NULL,
  bill_date DATE NOT NULL,
  previous_reading DECIMAL(10,2),
  current_reading DECIMAL(10,2),
  bill_amount DECIMAL(10,2) NOT NULL,
  paid_date DATE,
  payment_method VARCHAR(30) CHECK (payment_method IN ('CASH','UPI','CARD','BANK_TRANSFER','OTHER')),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PAID','PENDING')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room status history
CREATE TABLE IF NOT EXISTS room_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id),
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
`;

export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    logger.info('Running database migrations...');
    await client.query(migrationSQL);
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}
