import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesAPI } from '../api';
import { formatCurrency, formatDate } from '../utils';
import { LoadingPage, Modal, FormField } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Droplets, CheckCircle, Clock } from 'lucide-react';

const WaterBillsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    billing_month: new Date().toISOString().slice(0, 7),
    bill_date: new Date().toISOString().split('T')[0],
    previous_reading: '',
    current_reading: '',
    bill_amount: '',
    payment_status: 'PENDING',
    paid_date: '',
    payment_method: 'CASH',
    notes: '',
  });

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['water-bills'],
    queryFn: () => expensesAPI.getWaterBills().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => expensesAPI.createWaterBill(data),
    onSuccess: () => { toast.success('Water bill added'); queryClient.invalidateQueries({ queryKey: ['water-bills'] }); setModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => expensesAPI.updateWaterBill(id, data),
    onSuccess: () => { toast.success('Bill updated'); queryClient.invalidateQueries({ queryKey: ['water-bills'] }); },
  });

  const totalPending = bills.filter((b: any) => b.payment_status === 'PENDING').reduce((s: number, b: any) => s + Number(b.bill_amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Water Bills</h1>
          {totalPending > 0 && <p className="text-sm text-red-500">Pending: {formatCurrency(totalPending)}</p>}
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>

      {isLoading ? <LoadingPage /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map((b: any) => (
            <div key={b.id} className={`bg-white rounded-xl border-2 p-4 ${b.payment_status === 'PENDING' ? 'border-red-200' : 'border-green-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className={`w-5 h-5 ${b.payment_status === 'PENDING' ? 'text-red-500' : 'text-green-500'}`} />
                  <p className="font-semibold">{b.billing_month}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${b.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {b.payment_status === 'PAID' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {b.payment_status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(b.bill_amount)}</p>
              <p className="text-xs text-gray-500">Bill date: {formatDate(b.bill_date)}</p>
              {b.paid_date && <p className="text-xs text-green-600">Paid: {formatDate(b.paid_date)}</p>}
              {b.payment_status === 'PENDING' && (
                <button
                  className="mt-3 w-full text-sm bg-green-500 text-white rounded-lg py-1.5 hover:bg-green-600 transition-colors"
                  onClick={() => updateMutation.mutate({ id: b.id, data: { payment_status: 'PAID', paid_date: new Date().toISOString().split('T')[0] } })}
                >
                  Mark as Paid
                </button>
              )}
            </div>
          ))}
          {bills.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">No water bills recorded</p>}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Water Bill">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Billing Month" required>
              <input type="month" className="input" value={form.billing_month} onChange={e => setForm(p => ({ ...p, billing_month: e.target.value }))} />
            </FormField>
            <FormField label="Bill Date" required>
              <input type="date" className="input" value={form.bill_date} onChange={e => setForm(p => ({ ...p, bill_date: e.target.value }))} />
            </FormField>
            <FormField label="Previous Reading">
              <input type="number" className="input" value={form.previous_reading} onChange={e => setForm(p => ({ ...p, previous_reading: e.target.value }))} />
            </FormField>
            <FormField label="Current Reading">
              <input type="number" className="input" value={form.current_reading} onChange={e => setForm(p => ({ ...p, current_reading: e.target.value }))} />
            </FormField>
            <FormField label="Bill Amount" required>
              <input type="number" className="input" value={form.bill_amount} onChange={e => setForm(p => ({ ...p, bill_amount: e.target.value }))} />
            </FormField>
            <FormField label="Status">
              <select className="select" value={form.payment_status} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))}>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Add Bill</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WaterBillsPage;
