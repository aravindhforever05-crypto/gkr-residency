import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesAPI } from '../api';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { LoadingPage, EmptyState, Modal, FormField } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Receipt } from 'lucide-react';

const defaultForm = {
  category_id: '',
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  payment_method: 'CASH',
  paid_to: '',
  invoice_number: '',
  notes: '',
};

const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterCat, setFilterCat] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', filterCat],
    queryFn: () => expensesAPI.getAll({ category_id: filterCat || undefined, limit: 100 }).then(r => r.data.data as Expense[]),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expensesAPI.getCategories().then(r => r.data.data as ExpenseCategory[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => editItem ? expensesAPI.update(editItem.id, data) : expensesAPI.create(data),
    onSuccess: () => {
      toast.success(editItem ? 'Expense updated' : 'Expense added');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setModal(false);
      setEditItem(null);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesAPI.delete(id),
    onSuccess: () => { toast.success('Expense deleted'); queryClient.invalidateQueries({ queryKey: ['expenses'] }); },
  });

  const handleEdit = (expense: Expense) => {
    setEditItem(expense);
    setForm({
      category_id: String(expense.category_id),
      expense_date: expense.expense_date,
      description: expense.description,
      amount: String(expense.amount),
      payment_method: expense.payment_method || 'CASH',
      paid_to: expense.paid_to || '',
      invoice_number: expense.invoice_number || '',
      notes: expense.notes || '',
    });
    setModal(true);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    const cat = e.category_name || 'Other';
    acc[cat] = (acc[cat] || 0) + Number(e.amount);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">Total: {formatCurrency(totalExpenses)}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setForm(defaultForm); setModal(true); }}>
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Summary by category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(expensesByCategory).slice(0, 8).map(([cat, total]) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{cat}</p>
            <p className="font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select className="select max-w-xs" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <LoadingPage /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paid To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">{e.category_name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.description}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{e.payment_method}</td>
                    <td className="px-4 py-3 text-gray-500">{e.paid_to || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" onClick={() => handleEdit(e)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                          onClick={() => window.confirm('Delete this expense?') && deleteMutation.mutate(e.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && <EmptyState message="No expenses found" icon={<Receipt className="w-8 h-8" />} />}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required>
              <select className="select" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" className="input" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Description" required>
            <input className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount" required>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </FormField>
            <FormField label="Payment Method">
              <select className="select" value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </FormField>
            <FormField label="Paid To">
              <input className="input" value={form.paid_to} onChange={e => setForm(p => ({ ...p, paid_to: e.target.value }))} placeholder="Vendor/person name" />
            </FormField>
            <FormField label="Invoice Number">
              <input className="input" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.category_id || !form.description || !form.amount}
            >
              {createMutation.isPending ? 'Saving...' : editItem ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
