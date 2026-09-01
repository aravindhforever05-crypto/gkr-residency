import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersAPI } from '../api';
import { Customer } from '../types';
import { formatDate } from '../utils';
import { LoadingPage, EmptyState } from '../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, User } from 'lucide-react';

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersAPI.getAll({ search: search || undefined, page, limit: 20 }).then(r => r.data),
  });

  const customers: Customer[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{pagination?.total || 0} total customers</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <LoadingPage /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mobile</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID Proof</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.mobile}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.id_proof_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && <EmptyState message="No customers found" icon={<User className="w-8 h-8" />} />}
          </div>
        )}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button className="btn-secondary py-1.5 px-3" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></button>
              <button className="btn-secondary py-1.5 px-3" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
