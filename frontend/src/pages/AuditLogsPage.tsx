import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api';
import { formatDateTime } from '../utils';
import { LoadingPage } from '../components/ui';
import { ShieldCheck } from 'lucide-react';

const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => reportsAPI.getAuditLogs({ page, limit: 50 }).then(r => r.data),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <LoadingPage /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{log.user_name || 'System'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.entity_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="text-center text-gray-400 py-8">No audit logs found</p>}
          </div>
        )}
        {pagination && pagination.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">Page {page} — {pagination.total} total</p>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="btn-secondary py-1 px-3 text-sm" onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
