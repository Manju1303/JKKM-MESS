'use client';
import { useEffect, useState } from 'react';
import { purchasesAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, CheckCircle, Clock, XCircle, ShoppingCart, IndianRupee, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Purchase {
  id: number;
  invoiceNumber?: string;
  supplierName: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'received' | 'rejected';
  createdAt: string;
  deliveryDate?: string;
  items?: unknown[];
  notes?: string;
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/15 border-blue-500/30' },
  received: { label: 'Received', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/15 border-green-500/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30' },
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [autoDraftLoading, setAutoDraftLoading] = useState(false);
  const [autoDraftMsg, setAutoDraftMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await purchasesAPI.getAll();
      setPurchases(res.data || []);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAutoDraft = async () => {
    setAutoDraftLoading(true);
    setAutoDraftMsg(null);
    try {
      const res = await purchasesAPI.autoDraftPO();
      if (res.data && res.data.success) {
        setAutoDraftMsg({
          type: 'success',
          text: `Replenishment Complete: Generated ${res.data.createdCount} draft purchase orders for out-of-stock items.`
        });
        fetchPurchases();
      } else {
        setAutoDraftMsg({
          type: 'success',
          text: res.data?.message || 'Current stock levels are sufficient. No draft POs needed.'
        });
      }
    } catch (err: any) {
      setAutoDraftMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to auto-draft purchase orders.'
      });
    } finally {
      setAutoDraftLoading(false);
    }
  };

  const filtered = purchases.filter(p => {
    const matchSearch =
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalSpend = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const approvedCount = purchases.filter(p => p.status === 'approved').length;

  const handleApprove = async (id: number) => {
    try {
      await purchasesAPI.approve(id);
      setPurchases(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
    } catch { }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Spend', value: formatCurrency(totalSpend), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Approved Orders', value: approvedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Auto Draft Feedback Banner */}
      {autoDraftMsg && (
        <div className={cn(
          "p-4 rounded-xl flex items-start gap-2.5 text-sm border animate-in",
          autoDraftMsg.type === 'success' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          {autoDraftMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <span>{autoDraftMsg.text}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'received', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by supplier or invoice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={handleAutoDraft}
            disabled={autoDraftLoading}
            className="px-3 py-2 rounded-lg bg-[hsl(28,95%,15%)] text-[hsl(28,95%,50%)] border border-[hsl(28,95%,25%)] hover:bg-[hsl(28,95%,20%)] text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {autoDraftLoading ? 'Drafting...' : 'AI Auto-Draft POs'}
          </button>

          <button className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Invoice', 'Supplier', 'Date', 'Delivery', 'Amount', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No purchase orders found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const cfg = statusConfig[p.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {p.invoiceNumber || `PO-${p.id}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.supplierName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.deliveryDate ? formatDate(p.deliveryDate) : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(p.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium border', cfg.bg)}>
                          <StatusIcon className={cn('w-3 h-3', cfg.color)} />
                          <span className={cfg.color}>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-xs text-primary hover:underline">View</button>
                          {p.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(p.id)}
                              className="text-xs text-green-500 hover:underline"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          Showing {filtered.length} of {purchases.length} orders
        </div>
      </div>
    </div>
  );
}
