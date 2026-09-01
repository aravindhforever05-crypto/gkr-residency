import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsAPI } from '../api';
import { Booking } from '../types';
import { getBookingStatusConfig, getPaymentStatusConfig, formatDate, formatCurrency, getSourceLabel } from '../utils';
import { LoadingPage, EmptyState } from '../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { search, status, source, paymentStatus, page }],
    queryFn: () => bookingsAPI.getAll({
      search: search || undefined,
      status: status || undefined,
      booking_source: source || undefined,
      payment_status: paymentStatus || undefined,
      page,
      limit: 20,
    }).then(r => r.data),
  });

  const bookings: Booking[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{pagination?.total || 0} total bookings</p>
        </div>
        <Link to="/bookings/create" className="btn-primary">
          <Plus className="w-4 h-4" /> New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search name, mobile, booking ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className="select" value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); setPage(1); }}>
            <option value="">All Payment Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="FULLY_PAID">Fully Paid</option>
          </select>
          <select className="select" value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
            <option value="">All Sources</option>
            <option value="WALK_IN">Walk-in</option>
            <option value="PHONE">Phone</option>
            <option value="ONLINE">Online</option>
            <option value="WEBSITE">Website</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <LoadingPage />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Booking ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Room</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check-in</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Check-out</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => {
                  const statusCfg = getBookingStatusConfig(booking.booking_status);
                  const payCfg = getPaymentStatusConfig(booking.payment_status);
                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/bookings/${booking.booking_id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-indigo-600 font-medium">{booking.booking_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{booking.customer_name}</p>
                        <p className="text-xs text-gray-500">{booking.mobile}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {booking.room_number}
                        <span className="text-xs text-gray-400 ml-1">F{booking.floor_number}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(booking.check_in_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(booking.check_out_date)}</td>
                      <td className="px-4 py-3 text-center font-medium">{booking.num_days}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
                        {booking.pending_amount > 0 && (
                          <p className="text-xs text-red-500">Pending: {formatCurrency(booking.pending_amount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{getSourceLabel(booking.booking_source)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${payCfg.bg} ${payCfg.text}`}>
                          {payCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <EmptyState message="No bookings found" />
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary py-1.5 px-3 text-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="btn-secondary py-1.5 px-3 text-sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;
