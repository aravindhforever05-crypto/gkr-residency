import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api';
import { formatCurrency, getCurrentMonthYear } from '../utils';
import { LoadingPage } from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ReportsPage: React.FC = () => {
  const { year, month } = getCurrentMonthYear();
  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);

  const { data: monthly, isLoading } = useQuery({
    queryKey: ['monthly-report', selYear, selMonth],
    queryFn: () => reportsAPI.getMonthly({ year: selYear, month: selMonth }).then(r => r.data.data),
  });

  const { data: yearly } = useQuery({
    queryKey: ['yearly-revenue', selYear],
    queryFn: () => reportsAPI.getYearly({ year: selYear }).then(r => r.data.data),
  });

  const { data: sources } = useQuery({
    queryKey: ['booking-sources', selYear, selMonth],
    queryFn: () => reportsAPI.getBookingSources({ year: selYear, month: selMonth }).then(r => r.data.data),
  });

  const { data: occupancy } = useQuery({
    queryKey: ['occupancy', selYear, selMonth],
    queryFn: () => reportsAPI.getOccupancy({ year: selYear, month: selMonth }).then(r => r.data.data),
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Build yearly chart data
  const revenueByMonth: Record<number, number> = {};
  const expenseByMonth: Record<number, number> = {};
  yearly?.revenue.forEach((r: any) => { revenueByMonth[r.month] = parseFloat(r.revenue); });
  yearly?.expenses.forEach((e: any) => { expenseByMonth[e.month] = parseFloat(e.expenses); });

  const yearlyChartData = months.map((name, i) => ({
    name: name.slice(0, 3),
    revenue: revenueByMonth[i + 1] || 0,
    expenses: expenseByMonth[i + 1] || 0,
    profit: (revenueByMonth[i + 1] || 0) - (expenseByMonth[i + 1] || 0),
  }));

  const pieData = (sources || []).map((s: any) => ({
    name: s.booking_source === 'WALK_IN' ? 'Walk-in' : s.booking_source === 'ONLINE' ? 'Online' : s.booking_source,
    value: parseInt(s.count),
  }));

  const handleExport = () => {
    if (!monthly) return;
    const data = [
      ['GKR RESIDENCY - Monthly Report', ''],
      [`Month: ${months[selMonth - 1]} ${selYear}`, ''],
      ['', ''],
      ['REVENUE', ''],
      ['Total Received', monthly.revenue.total_received],
      ['Cash', monthly.revenue.cash],
      ['UPI', monthly.revenue.upi],
      ['Card', monthly.revenue.card],
      ['Online', monthly.revenue.online],
      ['', ''],
      ['EXPENSES', ''],
      ...monthly.expenses_by_category.map((e: any) => [e.category, e.total]),
      ['Total Expenses', monthly.total_expenses],
      ['Total Salary', monthly.total_salary],
      ['', ''],
      ['NET PROFIT', monthly.net_profit],
      ['Occupancy %', monthly.occupancy.percentage + '%'],
    ];

    const csvContent = data.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gkr-report-${selYear}-${selMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-3 flex-wrap">
          <select className="select" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <LoadingPage /> : monthly && (
        <>
          {/* P&L Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">{months[selMonth - 1]} {selYear} — P&L Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(monthly.revenue.total_received)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Expenses</p>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(monthly.total_expenses + monthly.total_salary)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Net Profit</p>
                <p className={`text-3xl font-bold ${monthly.net_profit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatCurrency(monthly.net_profit)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold">{monthly.bookings.total_bookings}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Room Nights</p>
              <p className="text-2xl font-bold">{monthly.bookings.total_room_nights}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Occupancy</p>
              <p className="text-2xl font-bold text-indigo-600">{monthly.occupancy.percentage}%</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">Pending (Bookings)</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(monthly.bookings.total_pending)}</p>
            </div>
          </div>

          {/* Revenue by method */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue by Method</h3>
              <div className="space-y-3">
                {[
                  { label: 'Cash', value: monthly.revenue.cash, color: 'bg-green-500' },
                  { label: 'UPI', value: monthly.revenue.upi, color: 'bg-blue-500' },
                  { label: 'Card', value: monthly.revenue.card, color: 'bg-purple-500' },
                  { label: 'Online', value: monthly.revenue.online, color: 'bg-amber-500' },
                  { label: 'Bank Transfer', value: monthly.revenue.bank_transfer, color: 'bg-gray-500' },
                ].filter(r => r.value > 0).map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{r.label}</span>
                      <span className="font-medium">{formatCurrency(r.value)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2">
                      <div
                        className={`${r.color} h-2 rounded-full`}
                        style={{ width: `${(r.value / monthly.revenue.total_received) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Expenses by Category</h3>
              <div className="space-y-2">
                {monthly.expenses_by_category.map((e: any, i: number) => (
                  <div key={e.category} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-sm text-gray-600">{e.category}</span>
                    <span className="font-medium text-red-600">{formatCurrency(e.total)}</span>
                  </div>
                ))}
                {monthly.total_salary > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Staff Salaries</span>
                    <span className="font-medium text-red-600">{formatCurrency(monthly.total_salary)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>Total Expenses</span>
                  <span className="text-red-600">{formatCurrency(monthly.total_expenses + monthly.total_salary)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Yearly chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue vs Expenses — {selYear}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={yearlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Booking sources & Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Sources</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {occupancy && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Occupancy by Floor</h3>
            <div className="space-y-4">
              {occupancy.map((f: any) => (
                <div key={f.floor_number}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Floor {f.floor_number}</span>
                    <span className="text-gray-500">{f.occupancy_pct}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-indigo-500 h-3 rounded-full transition-all"
                      style={{ width: `${f.occupancy_pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{f.occupied_nights} of {f.total_nights} nights</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
