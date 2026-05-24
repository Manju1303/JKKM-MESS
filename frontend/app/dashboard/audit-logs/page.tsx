'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { loginActivityAPI } from '@/lib/api';
import { Loader2, ShieldAlert, CheckCircle2, XCircle, Search, Laptop, KeyRound } from 'lucide-react';

interface LoginActivityItem {
  id: number;
  userId?: number;
  email: string;
  status: string; // SUCCESS, FAILED
  ipAddress: string;
  device: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<LoginActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const fetchLogs = async (filterEmail?: string) => {
    try {
      setLoading(true);
      const res = await loginActivityAPI.getAll(filterEmail);
      setLogs(res.data);
    } catch (err) {
      setError('Failed to fetch activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      fetchLogs();
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(emailFilter);
  };

  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const failCount = logs.filter(l => l.status === 'FAILED').length;

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <p className="font-semibold text-foreground">Unauthorized access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-xl font-bold text-foreground">ERP Security Audit Logs</h2>
        <p className="text-xs text-muted-foreground">Monitor institutional login attempts and lockout events</p>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Logs</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{logs.length}</h3>
          </div>
          <Laptop className="w-8 h-8 text-primary/40" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Successful Logins</p>
            <h3 className="text-2xl font-bold text-green-500 mt-1">{successCount}</h3>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-500/40" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Failed Attempts</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">{failCount}</h3>
          </div>
          <KeyRound className="w-8 h-8 text-amber-500/40" />
        </div>
      </div>

      {/* Filter and search form */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs by email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="min-h-[30vh] border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6">
          <p className="text-xs">No login logs matching the search filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Device / Client User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 whitespace-nowrap text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-semibold text-foreground">{log.email}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {log.status === 'SUCCESS' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-green-500 font-medium">SUCCESS</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-red-500 font-medium">FAILED</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{log.ipAddress}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate" title={log.device}>
                      {log.device}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
