'use client';
import { useEffect, useState } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import { inventoryAPI, kitchenAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Package, AlertTriangle, IndianRupee, Clock,
  TrendingDown, Trash2, ChefHat,
} from 'lucide-react';

// ── Mock chart data (replaced by real API in production) ─────────────────────
const stockTrendData = [
  { date: '22 May', rice: 450, dal: 120, oil: 30 },
  { date: '23 May', rice: 420, dal: 110, oil: 27 },
  { date: '24 May', rice: 390, dal: 105, oil: 24 },
  { date: '25 May', rice: 380, dal: 98,  oil: 20 },
  { date: '26 May', rice: 360, dal: 92,  oil: 17 },
  { date: '27 May', rice: 340, dal: 88,  oil: 15 },
  { date: '28 May', rice: 320, dal: 82,  oil: 12 },
];

const consumptionData = [
  { day: 'Mon', breakfast: 45, lunch: 120, dinner: 105 },
  { day: 'Tue', breakfast: 42, lunch: 118, dinner: 98  },
  { day: 'Wed', breakfast: 48, lunch: 125, dinner: 110 },
  { day: 'Thu', breakfast: 44, lunch: 122, dinner: 102 },
  { day: 'Fri', breakfast: 50, lunch: 130, dinner: 115 },
  { day: 'Sat', breakfast: 55, lunch: 140, dinner: 120 },
  { day: 'Sun', breakfast: 60, lunch: 145, dinner: 125 },
];

const expenseData = [
  { month: 'Jan', amount: 85000 },
  { month: 'Feb', amount: 92000 },
  { month: 'Mar', amount: 78000 },
  { month: 'Apr', amount: 95000 },
  { month: 'May', amount: 88000 },
  { month: 'Jun', amount: 102000 },
];

const wasteData = [
  { name: 'Expired',    value: 35, color: 'hsl(0,84%,60%)' },
  { name: 'Overcooked', value: 28, color: 'hsl(28,95%,50%)' },
  { name: 'Damaged',    value: 20, color: 'hsl(38,92%,50%)' },
  { name: 'Other',      value: 17, color: 'hsl(220,10%,60%)' },
];

// ── Custom tooltip shared by all charts ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Page component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats]         = useState<Record<string, number> | null>(null);
  const [lowStock, setLowStock]   = useState<unknown[]>([]);
  const [expiring, setExpiring]   = useState<unknown[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, lowStockRes, expiringRes] = await Promise.allSettled([
          inventoryAPI.getStats(),
          inventoryAPI.getLowStock(),
          inventoryAPI.getExpiringSoon(7),
        ]);
        if (statsRes.status === 'fulfilled')    setStats(statsRes.value.data);
        if (lowStockRes.status === 'fulfilled') setLowStock(lowStockRes.value.data);
        if (expiringRes.status === 'fulfilled') setExpiring(expiringRes.value.data);
      } catch {
        // Silently handle — mock data still renders
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const lowStockCount  = stats?.lowStockCount  ?? lowStock.length;
  const expiringCount  = stats?.expiringSoonCount ?? expiring.length;
  const totalItems     = stats?.totalItems ?? '—';
  const totalValue     = stats ? formatCurrency(stats.totalInventoryValue ?? 0) : '—';

  return (
    <div className="space-y-6 animate-in">
      {/* Live header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {currentTime.toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Live • {currentTime.toLocaleTimeString('en-IN')}</span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Inventory Items"
          value={totalItems}
          subtitle="Across all categories"
          icon={<Package className="w-5 h-5" />}
          variant="primary"
          trend={5}
          trendLabel="+3 items this week"
          isLoading={loading}
        />
        <StatsCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Below minimum level"
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={lowStockCount > 5 ? 'danger' : 'warning'}
          isLoading={loading}
        />
        <StatsCard
          title="Expiring Soon"
          value={expiringCount}
          subtitle="Within next 7 days"
          icon={<Clock className="w-5 h-5" />}
          variant={expiringCount > 3 ? 'danger' : 'warning'}
          isLoading={loading}
        />
        <StatsCard
          title="Inventory Value"
          value={totalValue}
          subtitle="Current stock valuation"
          icon={<IndianRupee className="w-5 h-5" />}
          variant="success"
          trend={3}
          isLoading={loading}
        />
      </section>

      {/* Charts Row 1 */}
      <section aria-label="Stock Trend and Waste Analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock level trend area chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Stock Level Trends</h3>
              <p className="text-xs text-muted-foreground">Last 7 days – Key items (KG)</p>
            </div>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stockTrendData}>
              <defs>
                <linearGradient id="riceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(224,76%,58%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(224,76%,58%)" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="dalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(28,95%,50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(28,95%,50%)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="rice" name="Ponni Rice" stroke="hsl(224,76%,58%)" fill="url(#riceGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="dal"  name="Toor Dal"   stroke="hsl(28,95%,50%)"  fill="url(#dalGrad)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Waste analytics donut */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Waste Analytics</h3>
              <p className="text-xs text-muted-foreground">This month by reason</p>
            </div>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={wasteData}
                cx="50%" cy="50%"
                innerRadius={40} outerRadius={60}
                paddingAngle={3} dataKey="value"
              >
                {wasteData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {wasteData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Row 2 */}
      <section aria-label="Daily Consumption and Expense Tracking" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily consumption bar chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Daily Consumption</h3>
              <p className="text-xs text-muted-foreground">Student count by meal – this week</p>
            </div>
            <ChefHat className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={consumptionData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="breakfast" name="Breakfast" fill="hsl(224,76%,58%)" radius={[3,3,0,0]} />
              <Bar dataKey="lunch"     name="Lunch"     fill="hsl(28,95%,50%)"  radius={[3,3,0,0]} />
              <Bar dataKey="dinner"    name="Dinner"    fill="hsl(142,71%,45%)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly expenses bar chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Monthly Expenses</h3>
              <p className="text-xs text-muted-foreground">Purchase spend – 2026</p>
            </div>
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Expenses" fill="hsl(224,76%,58%)" radius={[4,4,0,0]}>
                {expenseData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === expenseData.length - 1 ? 'hsl(28,95%,50%)' : 'hsl(224,76%,58%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick alerts row */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <section aria-label="Inventory Alerts" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <h4 className="font-semibold text-amber-500">Low Stock Alert</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-amber-400">{lowStockCount} items</span> are below minimum stock level.
                Raise purchase orders immediately.
              </p>
            </div>
          )}
          {expiringCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-red-500 flex-shrink-0" />
                <h4 className="font-semibold text-red-500">Expiry Warning</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-red-400">{expiringCount} items</span> will expire within 7 days.
                Use or return to supplier.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
