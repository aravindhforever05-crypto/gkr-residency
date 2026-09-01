import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI, paymentsAPI } from '../api';
import { Booking, Payment } from '../types';
import { formatCurrency, formatDate, formatDateTime, getBookingStatusConfig, getPaymentStatusConfig, getSourceLabel } from '../utils';
import { LoadingPage, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import { LogIn, LogOut, XCircle, Plus, Printer, Edit, ArrowLeft, CalendarDays, RefreshCw } from 'lucide-react';

const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentModal, setPaymentModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: 0, payment_method: 'CASH', payment_type: 'PARTIAL', transaction_reference: '', notes: '' });
  const [cancelForm, setCancelForm] = useState({ reason: '', cancellation_charges: 0, refund_amount: 0 });
  const [newCheckOut, setNewCheckOut] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsAPI.getById(id!).then(r => r.data.data as Booking & { payments: Payment[] }),
  });

  const checkInMutation = useMutation({
    mutationFn: () => bookingsAPI.checkIn(id!),
    onSuccess: () => { toast.success('Check-in successful!'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => bookingsAPI.checkOut(id!),
    onSuccess: (res) => {
      const d = res.data.data;
      if (d.pending_amount > 0) toast.error(`⚠️ Pending amount: ${formatCurrency(d.pending_amount)}`);
      else toast.success('Check-out successful!');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Check-out failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsAPI.cancel(id!, cancelForm),
    onSuccess: () => { toast.success('Booking cancelled'); setCancelModal(false); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Cancellation failed'),
  });

  const paymentMutation = useMutation({
    mutationFn: () => paymentsAPI.add({ ...payForm, booking_id: id }),
    onSuccess: () => { toast.success('Payment recorded!'); setPaymentModal(false); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  const extendMutation = useMutation({
    mutationFn: () => bookingsAPI.extend(id!, { new_check_out_date: newCheckOut }),
    onSuccess: () => { toast.success('Booking extended!'); setExtendModal(false); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Extension failed'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handlePrint = () => window.print();

  if (isLoading) return <LoadingPage />;
  if (!booking) return <div className="card">Booking not found</div>;

  const statusCfg = getBookingStatusConfig(booking.booking_status);
  const payCfg = getPaymentStatusConfig(booking.payment_status);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <button className="btn-secondary text-sm" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2 flex-wrap">
          {booking.booking_status === 'CONFIRMED' && (
            <button className="btn-success text-sm" onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
              <LogIn className="w-4 h-4" /> Check In
            </button>
          )}
          {booking.booking_status === 'CHECKED_IN' && (
            <>
              <button className="btn-primary text-sm" onClick={() => setExtendModal(true)}>
                <CalendarDays className="w-4 h-4" /> Extend Stay
              </button>
              <button className="btn-danger text-sm" onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}>
                <LogOut className="w-4 h-4" /> Check Out
              </button>
            </>
          )}
          {['CONFIRMED', 'CHECKED_IN'].includes(booking.booking_status) && (
            <button className="btn-primary text-sm" onClick={() => setPaymentModal(true)}>
              <Plus className="w-4 h-4" /> Add Payment
            </button>
          )}
          {['CONFIRMED', 'CHECKED_IN'].includes(booking.booking_status) && (
            <button className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelModal(true)}>
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
          <button className="btn-secondary text-sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Booking summary card (printable) */}
      <div className="card">
        {/* Print header */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-2xl font-bold">GKR RESIDENCY</h1>
          <p className="text-gray-500">Hotel Management System</p>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <h2 className="text-2xl font-bold text-indigo-600">{booking.booking_id}</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${payCfg.bg} ${payCfg.text}`}>
              {payCfg.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Customer info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 border-b pb-2">
              Customer Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-500 w-28">Name</span><span className="font-medium">{booking.customer_name}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Mobile</span><span className="font-medium">{booking.mobile}</span></div>
              {booking.email && <div className="flex gap-2"><span className="text-gray-500 w-28">Email</span><span>{booking.email}</span></div>}
              {booking.address && <div className="flex gap-2"><span className="text-gray-500 w-28">Address</span><span>{booking.address}</span></div>}
              <div className="flex gap-2"><span className="text-gray-500 w-28">Source</span><span>{getSourceLabel(booking.booking_source)}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Guests</span><span>{booking.num_guests}</span></div>
            </div>
          </div>

          {/* Stay details */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">Stay Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-500 w-28">Room</span><span className="font-bold text-lg">{booking.room_number}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Floor</span><span>{booking.floor_number}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Check-in</span><span className="font-medium">{formatDate(booking.check_in_date)}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Check-out</span><span className="font-medium">{formatDate(booking.check_out_date)}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-28">Duration</span><span className="font-semibold">{booking.num_days} nights</span></div>
              {booking.actual_check_in && <div className="flex gap-2"><span className="text-gray-500 w-28">Actual Check-in</span><span>{formatDateTime(booking.actual_check_in)}</span></div>}
              {booking.actual_check_out && <div className="flex gap-2"><span className="text-gray-500 w-28">Actual Check-out</span><span>{formatDateTime(booking.actual_check_out)}</span></div>}
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Billing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Room Rate</span><span>{formatCurrency(booking.room_rate)}/night × {booking.num_days} nights</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Room Amount</span><span>{formatCurrency(booking.room_amount)}</span></div>
            {Number(booking.additional_charges) > 0 && <div className="flex justify-between"><span className="text-gray-600">Additional Charges</span><span>+ {formatCurrency(booking.additional_charges)}</span></div>}
            {Number(booking.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatCurrency(booking.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Amount</span><span className="text-indigo-600">{formatCurrency(booking.total_amount)}</span></div>
            <div className="flex justify-between text-green-600"><span>Amount Paid</span><span>{formatCurrency(booking.paid_amount)}</span></div>
            <div className={`flex justify-between font-semibold ${Number(booking.pending_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>{Number(booking.pending_amount) > 0 ? 'Pending Amount' : 'Fully Paid ✓'}</span>
              <span>{formatCurrency(booking.pending_amount)}</span>
            </div>
          </div>
        </div>

        {booking.special_requests && (
          <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm">
            <span className="font-medium text-blue-900">Special Requests: </span>
            <span className="text-blue-700">{booking.special_requests}</span>
          </div>
        )}
      </div>

      {/* Payment history */}
      {booking.payments && booking.payments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 font-medium text-gray-500">Date</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Method</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Type</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Reference</th>
                  <th className="text-left pb-3 font-medium text-gray-500">Collected By</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2.5">{formatDateTime(p.payment_date)}</td>
                    <td className={`py-2.5 font-semibold ${p.payment_type === 'REFUND' ? 'text-red-500' : 'text-green-600'}`}>
                      {p.payment_type === 'REFUND' ? '-' : '+'}{formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5">{p.payment_method}</td>
                    <td className="py-2.5">{p.payment_type}</td>
                    <td className="py-2.5 text-gray-500">{p.transaction_reference || '—'}</td>
                    <td className="py-2.5 text-gray-500">{p.collected_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Add Payment">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-3 text-sm">
            <span className="font-medium">Pending: </span>
            <span className="text-amber-700 font-bold">{formatCurrency(booking.pending_amount)}</span>
          </div>
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input" value={payForm.amount} max={booking.pending_amount} onChange={e => setPayForm(p => ({ ...p, amount: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="select" value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Type</label>
            <select className="select" value={payForm.payment_type} onChange={e => setPayForm(p => ({ ...p, payment_type: e.target.value }))}>
              <option value="PARTIAL">Partial Payment</option>
              <option value="FULL">Full Payment</option>
              <option value="FINAL">Final Payment</option>
              <option value="ADVANCE">Advance</option>
            </select>
          </div>
          <div>
            <label className="label">Transaction Reference</label>
            <input className="input" value={payForm.transaction_reference} onChange={e => setPayForm(p => ({ ...p, transaction_reference: e.target.value }))} placeholder="UPI ID, Receipt no..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setPaymentModal(false)}>Cancel</button>
            <button className="btn-success" onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending || !payForm.amount}>
              {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Booking">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            This action will cancel booking {booking.booking_id} and free up room {booking.room_number}.
          </div>
          <div>
            <label className="label">Cancellation Reason</label>
            <textarea className="input" rows={2} value={cancelForm.reason} onChange={e => setCancelForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for cancellation..." />
          </div>
          <div>
            <label className="label">Cancellation Charges</label>
            <input type="number" className="input" value={cancelForm.cancellation_charges} onChange={e => setCancelForm(p => ({ ...p, cancellation_charges: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Refund Amount</label>
            <input type="number" className="input" value={cancelForm.refund_amount} max={booking.paid_amount} onChange={e => setCancelForm(p => ({ ...p, refund_amount: Number(e.target.value) }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setCancelModal(false)}>Keep Booking</button>
            <button className="btn-danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Extend Modal */}
      <Modal isOpen={extendModal} onClose={() => setExtendModal(false)} title="Extend Stay">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Current check-out: <strong>{formatDate(booking.check_out_date)}</strong></p>
          <div>
            <label className="label">New Check-out Date</label>
            <input
              type="date"
              className="input"
              value={newCheckOut}
              min={booking.check_out_date}
              onChange={e => setNewCheckOut(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setExtendModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => extendMutation.mutate()} disabled={!newCheckOut || extendMutation.isPending}>
              {extendMutation.isPending ? 'Extending...' : 'Extend Stay'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingDetailPage;
