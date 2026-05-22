'use client';
import { useEffect, useState } from 'react';
import { suppliersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Truck, Phone, Mail, MapPin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  category?: string;
  rating?: number;
  totalOrders?: number;
  totalSpend?: number;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    suppliersAPI.getAll()
      .then(res => setSuppliers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const totalSpend = suppliers.reduce((sum, s) => sum + (s.totalSpend || 0), 0);

  return (
    <div className="space-y-6 animate-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, icon: Truck, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active Suppliers', value: suppliers.filter(s => s.isActive).length, icon: Star, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Total Spend', value: formatCurrency(totalSpend), icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="font-semibold text-foreground">Supplier Directory</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Supplier cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="h-5 bg-muted animate-pulse rounded w-2/3" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                      {s.name}
                    </h3>
                    {s.category && (
                      <span className="text-xs text-muted-foreground">{s.category}</span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  s.isActive ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'
                )}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {s.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{s.contactPerson}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{s.phone}</span>
                </div>
                {s.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Total Orders</p>
                  <p className="font-semibold text-foreground">{s.totalOrders ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Spend</p>
                  <p className="font-semibold text-foreground">{formatCurrency(s.totalSpend ?? 0)}</p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  View Orders
                </button>
                <button className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
