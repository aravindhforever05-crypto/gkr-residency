import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesAPI } from '../api';
import { Employee } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { LoadingPage, EmptyState, Modal, FormField } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, UserCheck } from 'lucide-react';

const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [salaryModal, setSalaryModal] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '', role: '', monthly_salary: '', phone: '', email: '', joining_date: '' });
  const [salaryForm, setSalaryForm] = useState({
    payment_month: new Date().toISOString().slice(0, 7),
    salary_amount: 0,
    advance_deduction: 0,
    other_deductions: 0,
    bonus: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'CASH',
    notes: '',
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => expensesAPI.getEmployees().then(r => r.data.data as Employee[]),
  });

  const { data: salaries = [] } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => expensesAPI.getSalary().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => expensesAPI.createEmployee(data),
    onSuccess: () => { toast.success('Employee added'); queryClient.invalidateQueries({ queryKey: ['employees'] }); setModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const salarymMutation = useMutation({
    mutationFn: (data: any) => expensesAPI.addSalary(data),
    onSuccess: () => { toast.success('Salary recorded'); queryClient.invalidateQueries({ queryKey: ['salaries'] }); setSalaryModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const totalSalary = employees.reduce((s, e) => s + Number(e.monthly_salary), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">Total monthly salary: {formatCurrency(totalSalary)}</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? <LoadingPage /> : employees.map(e => (
          <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-indigo-700">
                  {e.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{e.name}</p>
                  <p className="text-sm text-gray-500">{e.role}</p>
                </div>
              </div>
              <p className="font-bold text-indigo-600">{formatCurrency(e.monthly_salary)}<span className="text-xs text-gray-400">/mo</span></p>
            </div>
            {e.phone && <p className="text-xs text-gray-500 mt-2">{e.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">Joined: {formatDate(e.joining_date)}</p>
            <button
              className="mt-3 w-full text-sm text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
              onClick={() => { setSalaryModal(e); setSalaryForm(p => ({ ...p, salary_amount: e.monthly_salary })); }}
            >
              Pay Salary
            </button>
          </div>
        ))}
      </div>

      {/* Recent salary payments */}
      {salaries.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Salary Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Salary</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Net Paid</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium">{s.employee_name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.payment_month}</td>
                    <td className="px-4 py-3">{formatCurrency(s.salary_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(s.net_amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.payment_date)}</td>
                    <td className="px-4 py-3 text-gray-500">{s.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Employee">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </FormField>
            <FormField label="Role" required>
              <input className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Housekeeper, Receptionist..." />
            </FormField>
            <FormField label="Monthly Salary" required>
              <input type="number" className="input" value={form.monthly_salary} onChange={e => setForm(p => ({ ...p, monthly_salary: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </FormField>
            <FormField label="Joining Date" required>
              <input type="date" className="input" value={form.joining_date} onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Add</button>
          </div>
        </div>
      </Modal>

      {/* Salary Modal */}
      <Modal isOpen={!!salaryModal} onClose={() => setSalaryModal(null)} title={`Pay Salary - ${salaryModal?.name}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Month">
              <input type="month" className="input" value={salaryForm.payment_month} onChange={e => setSalaryForm(p => ({ ...p, payment_month: e.target.value }))} />
            </FormField>
            <FormField label="Salary Amount">
              <input type="number" className="input" value={salaryForm.salary_amount} onChange={e => setSalaryForm(p => ({ ...p, salary_amount: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Advance Deduction">
              <input type="number" className="input" value={salaryForm.advance_deduction} onChange={e => setSalaryForm(p => ({ ...p, advance_deduction: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Bonus">
              <input type="number" className="input" value={salaryForm.bonus} onChange={e => setSalaryForm(p => ({ ...p, bonus: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Payment Date">
              <input type="date" className="input" value={salaryForm.payment_date} onChange={e => setSalaryForm(p => ({ ...p, payment_date: e.target.value }))} />
            </FormField>
            <FormField label="Method">
              <select className="select" value={salaryForm.payment_method} onChange={e => setSalaryForm(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </FormField>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            Net: <strong>{formatCurrency(salaryForm.salary_amount + salaryForm.bonus - salaryForm.advance_deduction)}</strong>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setSalaryModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => salarymMutation.mutate({ ...salaryForm, employee_id: salaryModal?.id })} disabled={salarymMutation.isPending}>
              Record Payment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
