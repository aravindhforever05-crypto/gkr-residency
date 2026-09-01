import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../api';
import { formatDateTime } from '../utils';
import { LoadingPage, Modal, FormField } from '../components/ui';
import toast from 'react-hot-toast';
import { Plus, UserCheck } from 'lucide-react';

const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '', phone: '' });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => authAPI.getUsers().then(r => r.data.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authAPI.getRoles().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => authAPI.createUser(data),
    onSuccess: () => { toast.success('User created'); queryClient.invalidateQueries({ queryKey: ['users'] }); setModal(false); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: any) => authAPI.updateUser(id, { is_active }),
    onSuccess: () => { toast.success('User updated'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <LoadingPage /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={`text-xs ${u.is_active ? 'text-red-500 hover:underline' : 'text-green-500 hover:underline'}`}
                      onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add User">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </FormField>
            <FormField label="Email" required>
              <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </FormField>
            <FormField label="Password" required>
              <input type="password" className="input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </FormField>
            <FormField label="Role" required>
              <select className="select" value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}>
                <option value="">Select role</option>
                {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Create User</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
