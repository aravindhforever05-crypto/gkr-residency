import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api';
import { LoadingPage } from '../components/ui';
import { formatCurrency, getCurrentMonthYear } from '../utils';
import { Download } from 'lucide-react';

const MonthlyTallyPage: React.FC = () => {
  const { year, month } = getCurrentMonthYear();
  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-tally', selYear, selMonth],
    queryFn: () => reportsAPI.getMonthly({ year: selYear, month: selMonth }).then(r => r.data.data),
  });

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const handleExport = () => {
    if (!data) return;
    const rows = [
      `GKR RESIDENCY — MONTHLY TALLY`,
      `${months[selMonth-1]} ${selYear}`,
      ``,
      `Total Rooms: 30`,
      `Total Bookings: ${data.bookings.total_bookings}`,
      `Total Room Nights: ${data.bookings.total_room_nights}`,
      `Occupancy: ${data.occupancy.percentage}%`,
      ``,
      `REVENUE`,
      `Customer Amount Received: ${data.revenue.total_received}`,
      `Pending (Booking): ${data.bookings.total_pending}`,
      `Cash Collection: ${data.revenue.cash}`,
      `UPI Collection: ${data.revenue.upi}`,
      `Card Collection: ${data.revenue.card}`,
      `Online Collection: ${data.revenue.online}`,
      ``,
      `EXPENSES`,
      ...data.expenses_by_category.map((e: any) => `${e.category}: ${e.total}`),
      `Staff Salary: ${data.total_salary}`,
      `Total Expenses: ${data.total_expenses + data.total_salary}`,
      ``,
      `NET PROFIT: ${data.net_profit}`,
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gkr-tally-${selYear}-${selMonth}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Monthly Tally</h1>
        <div className="flex gap-3">
          <select className="select" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="select" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {isLoading ? <LoadingPage /> : data && (
        <div className="card font-mono">
          <div className="text-center border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-xl font-bold tracking-widest">GKR RESIDENCY</h2>
            <p className="text-gray-500 text-sm mt-1">Monthly Tally — {months[selMonth-1]} {selYear}</p>
          </div>

          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-3 text-indigo-600">Overview</h3>
              <div className="space-y-2">
                {[
                  ['Total Rooms', '30'],
                  ['Total Bookings', data.bookings.total_bookings],
                  ['Total Room Nights', data.bookings.total_room_nights],
                  ['Occupancy', `${data.occupancy.percentage}%`],
                  ['Online Bookings', data.bookings.online_bookings],
                  ['Walk-in Bookings', data.bookings.walkin_bookings],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                    <span className="text-gray-600">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-3 text-green-600">Revenue</h3>
              <div className="space-y-2">
                {[
                  ['Total Received', formatCurrency(data.revenue.total_received)],
                  ['Cash', formatCurrency(data.revenue.cash)],
                  ['UPI', formatCurrency(data.revenue.upi)],
                  ['Card', formatCurrency(data.revenue.card)],
                  ['Online', formatCurrency(data.revenue.online)],
                  ['Pending (Outstanding)', formatCurrency(data.bookings.total_pending)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                    <span className="text-gray-600">{k}</span>
                    <span className={k === 'Pending (Outstanding)' ? 'text-red-500 font-semibold' : 'font-semibold'}>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs mb-3 text-red-600">Expenses</h3>
              <div className="space-y-2">
                {data.expenses_by_category.map((e: any) => (
                  <div key={e.category} className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                    <span className="text-gray-600">{e.category}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(e.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                  <span className="text-gray-600">Staff Salaries</span>
                  <span className="font-semibold text-red-600">{formatCurrency(data.total_salary)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-700 pt-1">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(data.total_expenses + data.total_salary)}</span>
                </div>
              </div>
            </section>

            <section className="bg-indigo-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-indigo-900">NET PROFIT</span>
                <span className={`text-2xl font-bold ${data.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.net_profit)}
                </span>
              </div>
              <p className="text-xs text-indigo-600 mt-1">Revenue − Expenses = {formatCurrency(data.revenue.total_received)} − {formatCurrency(data.total_expenses + data.total_salary)}</p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyTallyPage;
