import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsAPI } from '../api';
import { Payment } from '../types';
import { formatCurrency, formatDateTime } from '../utils';
import { LoadingPage, EmptyState } from '../components/ui';
import { Search, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PaymentsPage: React.FC = () => {
  const [tab, setTab] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');

  const { data: allPayments, isLoading } = useQuery({
    queryKey: ['payments', method],
    queryFn: () => paymentsAPI.getAll({ payment_method: method || undefined, limit: 50 }).then(r => r.data.data as Payment[]),
    enabled: tab === 'all',
  });

  const { data: pendingPayments, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => paymentsAPI.getPending().then(r => r.data.data),
    enabled: tab === 'pending',
  });

  const displayPayments = tab === 'all' ? (allPayments || []).filter(p =>
    !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.booking_ref?.includes(search)
  ) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All Payments' },
          { key: 'pending', label: 'Pending Payments' },
        ].map(t => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9 max-w-xs" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select max-w-xs" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? <LoadingPage /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Booking</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Room</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPayments.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{formatDateTime(p.payment_date)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/bookings/${p.booking_ref}`} className="text-indigo-600 font-medium hover:underline">{p.booking_ref}</Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{p.customer_name}</td>
                        <td className="px-4 py-3">{p.room_number}</td>
                        <td className={`px-4 py-3 font-semibold ${p.payment_type === 'REFUND' ? 'text-red-500' : 'text-green-600'}`}>
                          {p.payment_type === 'REFUND' ? '-' : '+'}{formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{p.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.payment_type}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{p.transaction_reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayPayments.length === 0 && <EmptyState message="No payments found" />}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {pendingLoading ? <LoadingPage /> : (
            <>
              {pendingPayments?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-900">{pendingPayments.length} bookings with pending payments</p>
                    <p className="text-sm text-red-600">Total: {formatCurrency(pendingPayments.reduce((s: number, p: any) => s + Number(p.pending_amount), 0))}</p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Booking</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Room</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Check-out</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Pending</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pendingPayments || []).map((p: any) => (
                      <tr key={p.booking_id} className="border-b border-gray-50">
                        <td className="px-4 py-3"><Link to={`/bookings/${p.booking_id}`} className="text-indigo-600 font-medium hover:underline">{p.booking_id}</Link></td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.customer_name}</p>
                          <p className="text-xs text-gray-500">{p.mobile}</p>
                        </td>
                        <td className="px-4 py-3 font-medium">{p.room_number}</td>
                        <td className="px-4 py-3 text-gray-500">{p.check_out_date}</td>
                        <td className="px-4 py-3">{formatCurrency(p.total_amount)}</td>
                        <td className="px-4 py-3 text-green-600">{formatCurrency(p.paid_amount)}</td>
                        <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(p.pending_amount)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/bookings/${p.booking_id}`} className="text-indigo-600 hover:underline text-xs">Add Payment</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!pendingPayments || pendingPayments.length === 0) && <EmptyState message="No pending payments" icon={<AlertCircle className="w-8 h-8 text-green-400" />} />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
