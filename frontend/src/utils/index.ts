import { format, parseISO } from 'date-fns';
import { RoomStatus } from '../types';

export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (date: string): string => {
  try {
    return format(parseISO(date), 'dd-MMM-yyyy');
  } catch {
    return date;
  }
};

export const formatDateTime = (date: string): string => {
  try {
    return format(parseISO(date), 'dd-MMM-yyyy hh:mm a');
  } catch {
    return date;
  }
};

export const getRoomStatusConfig = (status: RoomStatus) => {
  const configs: Record<RoomStatus, { label: string; color: string; bg: string; text: string; dot: string }> = {
    AVAILABLE: {
      label: 'Available',
      color: 'green',
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    BOOKED: {
      label: 'Booked',
      color: 'blue',
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    OCCUPIED: {
      label: 'Occupied',
      color: 'orange',
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      dot: 'bg-orange-500',
    },
    CHECK_IN_TODAY: {
      label: 'Check-in Today',
      color: 'cyan',
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      dot: 'bg-cyan-500',
    },
    CHECK_OUT_TODAY: {
      label: 'Check-out Today',
      color: 'purple',
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
    },
    CLEANING: {
      label: 'Cleaning',
      color: 'yellow',
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
    },
    MAINTENANCE: {
      label: 'Maintenance',
      color: 'red',
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
    BLOCKED: {
      label: 'Blocked',
      color: 'gray',
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
    },
  };
  return configs[status] || configs.AVAILABLE;
};

export const getPaymentStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Pending', bg: 'bg-red-100', text: 'text-red-800' },
    PARTIALLY_PAID: { label: 'Partial', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    FULLY_PAID: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800' },
  };
  return configs[status] || configs.PENDING;
};

export const getBookingStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    CONFIRMED: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800' },
    CHECKED_IN: { label: 'Checked In', bg: 'bg-green-100', text: 'text-green-800' },
    CHECKED_OUT: { label: 'Checked Out', bg: 'bg-gray-100', text: 'text-gray-800' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
    NO_SHOW: { label: 'No Show', bg: 'bg-orange-100', text: 'text-orange-800' },
  };
  return configs[status] || configs.CONFIRMED;
};

export const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    WALK_IN: 'Walk-in',
    PHONE: 'Phone',
    WEBSITE: 'Website',
    ONLINE: 'Online',
    OTHER: 'Other',
  };
  return labels[source] || source;
};

export const getCurrentMonthYear = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};
