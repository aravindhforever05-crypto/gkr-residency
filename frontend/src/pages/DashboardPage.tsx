import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api';
import { formatCurrency } from '../utils';
import { StatCard, LoadingPage } from '../components/ui';
import {
  Hotel, Users, CreditCard, TrendingUp, TrendingDown,
  CalendarCheck, LogIn, LogOut, AlertCircle, CheckCircle,
  Wrench, Sparkles, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { getBookingStatusConfig, getPaymentStatusConfig, formatDate } from '../utils';
import { DashboardData } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsAPI.getDashboard().then(r => r.data.data as DashboardData),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) return <LoadingPage />;
  if (!data) return null;

  const rooms = data.rooms;

  const roomStatusData = [
    { name: 'Available', value: Number(rooms.available), color: '#10b981' },
    { name: 'Occupied', value: Number(rooms.occupied), color: '#f59e0b' },
    { name: 'Booked', value: Number(rooms.booked), color: '#6366f1' },
    { name: 'Cleaning', value: Number(rooms.cleaning), color: '#eab308' },
    { name: 'Maintenance', value: Number(rooms.maintenance), color: '#ef4444' },
  ].filter(d => d.value > 0);

  const revenueByMethodData = data.revenue_by_method.map(r => ({
    name: r.payment_method,
    value: parseFloat(r.total),
  }));

  return (
    <div className="space-y-6">
      {/* Hotel banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">🏨 GKR RESIDENCY</h1>
            <p className="text-slate-300 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold">{rooms.total_rooms}</p>
              <p className="text-xs text-slate-400">Total Rooms</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{rooms.available}</p>
              <p className="text-xs text-slate-400">Available</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{rooms.occupied}</p>
              <p className="text-xs text-slate-400">Occupied</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's alerts */}
      {(data.today_checkins > 0 || data.today_checkouts > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.today_checkins > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-green-100 rounded-lg p-2">
                <LogIn className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">{data.today_checkins} Check-in{data.today_checkins > 1 ? 's' : ''} Today</p>
                <Link to="/bookings?status=CONFIRMED" className="text-xs text-green-600 hover:underline flex items-center gap-1">
                  View bookings <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
          {data.today_checkouts > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <LogOut className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-purple-900">{data.today_checkouts} Check-out{data.today_checkouts > 1 ? 's' : ''} Today</p>
                <Link to="/bookings?status=CHECKED_IN" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                  View bookings <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{rooms.available}</p>
          <p className="text-sm text-green-600 font-medium">Available</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{rooms.booked}</p>
          <p className="text-sm text-blue-600 font-medium">Booked</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-700">{rooms.occupied}</p>
          <p className="text-sm text-orange-600 font-medium">Occupied</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-700">{rooms.cleaning}</p>
          <p className="text-sm text-yellow-600 font-medium">Cleaning</p>
        </div>
      </div>

      {/* Financial stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data.today_revenue)}
          icon={<CreditCard className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.monthly_revenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(data.monthly_expenses)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          title="Monthly Profit"
          value={formatCurrency(data.monthly_profit)}
          icon={<TrendingUp className="w-5 h-5" />}
          color={data.monthly_profit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Pending payments alert */}
      {data.pending_payments.count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">
                {data.pending_payments.count} bookings with pending payments
              </p>
              <p className="text-sm text-red-600">Total pending: {formatCurrency(data.pending_payments.total)}</p>
            </div>
          </div>
          <Link to="/payments?filter=pending" className="btn-danger text-sm">
            View Pending
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room status chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Room Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roomStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {roomStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Rooms']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by payment method */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Payment Method (This Month)</h3>
          {revenueByMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Amount']} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No payment data for this month
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
          <Link to="/bookings" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-3 font-medium text-gray-500">Booking ID</th>
                <th className="pb-3 font-medium text-gray-500">Customer</th>
                <th className="pb-3 font-medium text-gray-500">Room</th>
                <th className="pb-3 font-medium text-gray-500">Check-in</th>
                <th className="pb-3 font-medium text-gray-500">Check-out</th>
                <th className="pb-3 font-medium text-gray-500">Amount</th>
                <th className="pb-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_bookings.map(booking => {
                const statusCfg = getBookingStatusConfig(booking.booking_status);
                const payCfg = getPaymentStatusConfig(booking.payment_status);
                return (
                  <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">
                      <Link to={`/bookings/${booking.booking_id}`} className="text-indigo-600 font-medium hover:underline">
                        {booking.booking_id}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-900">{booking.customer_name}</td>
                    <td className="py-3 font-medium">{booking.room_number}</td>
                    <td className="py-3 text-gray-600">{formatDate(booking.check_in_date)}</td>
                    <td className="py-3 text-gray-600">{formatDate(booking.check_out_date)}</td>
                    <td className="py-3 font-medium">{formatCurrency(booking.total_amount)}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.recent_bookings.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No recent bookings</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link to="/bookings/create" className="card hover:shadow-md transition-shadow text-center group">
          <div className="bg-indigo-50 rounded-lg p-3 w-fit mx-auto mb-2 group-hover:bg-indigo-100">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">New Booking</p>
        </Link>
        <Link to="/rooms" className="card hover:shadow-md transition-shadow text-center group">
          <div className="bg-green-50 rounded-lg p-3 w-fit mx-auto mb-2 group-hover:bg-green-100">
            <Hotel className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">View Rooms</p>
        </Link>
        <Link to="/customers" className="card hover:shadow-md transition-shadow text-center group">
          <div className="bg-blue-50 rounded-lg p-3 w-fit mx-auto mb-2 group-hover:bg-blue-100">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">Customers</p>
        </Link>
        <Link to="/reports" className="card hover:shadow-md transition-shadow text-center group">
          <div className="bg-amber-50 rounded-lg p-3 w-fit mx-auto mb-2 group-hover:bg-amber-100">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">Reports</p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
