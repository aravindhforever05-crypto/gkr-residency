export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export interface Room {
  id: string;
  room_number: string;
  floor_id: number;
  floor_number: number;
  floor_name: string;
  room_type: string;
  base_price: number;
  capacity: number;
  description?: string;
  amenities: string[];
  status: RoomStatus;
  current_booking?: Booking;
}

export type RoomStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'OCCUPIED'
  | 'CHECK_IN_TODAY'
  | 'CHECK_OUT_TODAY'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'BLOCKED';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_id: string;
  customer_id: string;
  room_id: string;
  customer_name: string;
  mobile: string;
  email?: string;
  room_number: string;
  floor_number: number;
  check_in_date: string;
  check_out_date: string;
  actual_check_in?: string;
  actual_check_out?: string;
  num_guests: number;
  num_days: number;
  room_rate: number;
  room_amount: number;
  additional_charges: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID';
  booking_status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
  booking_source: 'WALK_IN' | 'PHONE' | 'WEBSITE' | 'ONLINE' | 'OTHER';
  special_requests?: string;
  address?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  payments?: Payment[];
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  booking_ref?: string;
  customer_id: string;
  customer_name?: string;
  room_number?: string;
  amount: number;
  payment_date: string;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'OTHER';
  payment_type: 'ADVANCE' | 'PARTIAL' | 'FULL' | 'FINAL' | 'REFUND';
  transaction_reference?: string;
  notes?: string;
  collected_by_name?: string;
}

export interface Expense {
  id: string;
  category_id: number;
  category_name?: string;
  expense_date: string;
  description: string;
  amount: number;
  payment_method?: string;
  paid_to?: string;
  invoice_number?: string;
  notes?: string;
  created_by_name?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  monthly_salary: number;
  phone?: string;
  email?: string;
  joining_date: string;
  is_active: boolean;
}

export interface WaterBill {
  id: string;
  billing_month: string;
  bill_date: string;
  previous_reading?: number;
  current_reading?: number;
  bill_amount: number;
  paid_date?: string;
  payment_status: 'PAID' | 'PENDING';
}

export interface DashboardData {
  rooms: {
    total_rooms: number;
    available: number;
    booked: number;
    occupied: number;
    cleaning: number;
    maintenance: number;
    check_in_today: number;
    check_out_today: number;
  };
  today_checkins: number;
  today_checkouts: number;
  today_revenue: number;
  monthly_revenue: number;
  monthly_expenses: number;
  monthly_profit: number;
  pending_payments: { count: number; total: number };
  recent_bookings: Booking[];
  revenue_by_method: { payment_method: string; total: string }[];
}

export interface Floor {
  id: number;
  floor_number: number;
  name: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}
