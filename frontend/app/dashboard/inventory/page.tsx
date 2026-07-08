'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { inventoryAPI } from '@/lib/api';
import { formatCurrency, formatDate, getDaysUntilExpiry, getStockStatus } from '@/lib/utils';
import {
  Search, Filter, Plus, AlertTriangle, Clock, Package,
  TrendingDown, BarChart3, RefreshCw, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: number;
  productName: string;
  categoryName: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  expiryDate?: string;
  purchasePrice: number;
  supplier?: string;
  batchNumber?: string;
  location?: string;
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-500 border-red-500/30',
    low: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    normal: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    high: 'bg-green-500/15 text-green-500 border-green-500/30',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', styles[status] || styles.normal)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const downloadCSV = () => {
    const headers = ['Product Name', 'Category', 'Quantity', 'Unit', 'Min Level', 'Status', 'Expiry Date', 'Total Value (INR)', 'Location'];
    const rows = filtered.map(item => {
      const status = getStockStatus(item.quantity, item.minStockLevel);
      const val = item.quantity * item.purchasePrice;
      const expiry = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : 'N/A';
      return [
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${(item.categoryName || '').replace(/"/g, '""')}"`,
        item.quantity,
        `"${item.unit}"`,
        item.minStockLevel,
        `"${status}"`,
        `"${expiry}"`,
        val.toFixed(2),
        `"${(item.location || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_status_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await inventoryAPI.getAll();
      const mapped = (res.data || []).map((i: any) => ({
        id: i.id,
        productName: i.product?.name || 'Unknown',
        categoryName: i.product?.category?.name || 'Unknown',
        quantity: i.quantity,
        unit: i.unit || i.product?.unit || '',
        minStockLevel: i.product?.minStockLevel || 0,
        expiryDate: i.expiryDate,
        purchasePrice: i.costPerUnit ?? 0,
        batchNumber: i.batchNumber,
        location: i.location,
      }));
      setItems(mapped);
    } catch {
      // API not connected – keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(item => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.categoryName?.toLowerCase().includes(search.toLowerCase());
    const status = getStockStatus(item.quantity, item.minStockLevel);
    if (filter === 'low') return matchesSearch && (status === 'low' || status === 'critical');
    if (filter === 'expiring') {
      const days = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : Infinity;
      return matchesSearch && days <= 7;
    }
    return matchesSearch;
  });

  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.purchasePrice), 0);
  const lowCount = items.filter(i => {
    const s = getStockStatus(i.quantity, i.minStockLevel);
    return s === 'low' || s === 'critical';
  }).length;
  const expiringCount = items.filter(i =>
    i.expiryDate && getDaysUntilExpiry(i.expiryDate) <= 7
  ).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Summary cards */}
      <section aria-label="Inventory Summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: items.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Low Stock', value: lowCount, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Expiring', value: expiringCount, icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Total Value', value: formatCurrency(totalValue), icon: BarChart3, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {['all', 'low', 'expiring'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'all' ? 'All Items' : f === 'low' ? `Low Stock (${lowCount})` : `Expiring (${expiringCount})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
            <button
              onClick={downloadCSV}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-all font-sans"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <Link
              href="/dashboard/barcode"
              className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/95 transition-all font-sans"
            >
              <Plus className="w-4 h-4" /> Add Stock
            </Link>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Product', 'Category', 'Quantity', 'Min Level', 'Status', 'Expiry', 'Value', 'Location'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>{search ? 'No matching items found' : 'No inventory items yet'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const status = getStockStatus(item.quantity, item.minStockLevel);
                  const daysLeft = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null;
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        {item.batchNumber && (
                          <p className="text-xs text-muted-foreground">Batch: {item.batchNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.categoryName}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.minStockLevel} {item.unit}
                      </td>
                      <td className="px-4 py-3">{statusBadge(status)}</td>
                      <td className="px-4 py-3">
                        {daysLeft !== null ? (
                          <span className={cn('text-xs font-medium', daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground')}>
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatCurrency(item.quantity * item.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.location || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          Showing {filtered.length} of {items.length} items
        </div>
      </div>
    </div>
  );
}
