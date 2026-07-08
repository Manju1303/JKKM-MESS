'use client';
import { useEffect, useState } from 'react';
import { productsAPI } from '@/lib/api';
import { Search, Plus, Package, Tag, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  categoryName: string;
  type: string;
  unit: string;
  purchasePrice: number;
  sellingPrice?: number;
  barcode?: string;
  minStockLevel: number;
  currentStock?: number;
  isActive: boolean;
}

const typeColors: Record<string, string> = {
  packaged:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  vegetable:  'bg-green-500/15 text-green-400 border-green-500/30',
  bulk:       'bg-amber-500/15 text-amber-400 border-amber-500/30',
  other:      'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    productsAPI.getAll()
      .then(res => {
        const mapped = (res.data || []).map((p: any) => ({
          ...p,
          categoryName: p.category?.name || 'Unknown',
          purchasePrice: p.purchasePrice || 0,
        }));
        setProducts(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const types = ['all', 'packaged', 'vegetable', 'bulk', 'other'];

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                typeFilter === t
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'all' ? 'All Products' : t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-8 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
                  typeColors[p.type] || typeColors.other
                )}>
                  {p.type}
                </span>
              </div>
              <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                {p.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">{p.categoryName}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit</span>
                  <span className="text-foreground font-medium">{p.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-foreground font-medium">{formatCurrency(p.purchasePrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Min Stock</span>
                  <span className="text-foreground font-medium">{p.minStockLevel} {p.unit}</span>
                </div>
                {p.barcode && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Barcode</span>
                    <span className="text-foreground font-mono text-[10px]">{p.barcode}</span>
                  </div>
                )}
              </div>
              <div className={cn(
                'mt-3 pt-3 border-t border-border flex items-center justify-between',
              )}>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  p.isActive ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'
                )}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="text-xs text-primary hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {products.length} products
      </p>
    </div>
  );
}
