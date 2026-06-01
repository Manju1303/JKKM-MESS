'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import { useAuthStore } from '@/store/authStore';
import { inventoryAPI, attendanceAPI, purchasesAPI, complaintsAPI, menuAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Package, AlertTriangle, IndianRupee, Clock,
  TrendingDown, Trash2, ChefHat, Users, ShieldAlert,
  FileText, CheckCircle, MessageSquare, ListTodo, Plus, Calendar, Eye, ClipboardList, ArrowRight, Camera
} from 'lucide-react';

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

const transformAttendanceTrend = (records: any[]) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap: Record<string, { day: string; Breakfast: number; Lunch: number; Dinner: number; Snack: number; breakfast: number; lunch: number; dinner: number; snack: number }> = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    dayMap[dateStr] = {
      day: dayName,
      Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0,
      breakfast: 0, lunch: 0, dinner: 0, snack: 0
    };
  }

  records.forEach((r) => {
    const dateStr = new Date(r.date).toISOString().split('T')[0];
    if (dayMap[dateStr]) {
      const mealKey = r.meal.toUpperCase();
      if (mealKey === 'BREAKFAST') {
        dayMap[dateStr].Breakfast += r.count;
        dayMap[dateStr].breakfast += r.count;
      } else if (mealKey === 'LUNCH') {
        dayMap[dateStr].Lunch += r.count;
        dayMap[dateStr].lunch += r.count;
      } else if (mealKey === 'DINNER') {
        dayMap[dateStr].Dinner += r.count;
        dayMap[dateStr].dinner += r.count;
      } else if (mealKey === 'SNACK') {
        dayMap[dateStr].Snack += r.count;
        dayMap[dateStr].snack += r.count;
      }
    }
  });

  return Object.values(dayMap);
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [lowStock, setLowStock] = useState<unknown[]>([]);
  const [expiring, setExpiring] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real datasets for charts
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([]);
  const [stockTrend, setStockTrend] = useState<any[]>([]);

  // Warden live data
  const [todayHeadcount, setTodayHeadcount] = useState(0);
  const [unresolvedComplaints, setUnresolvedComplaints] = useState(0);

  // Student viewer — today's menu
  const [todayMenu, setTodayMenu] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, lowStockRes, expiringRes, trendRes, expensesRes, invRes,
               attendanceStatsRes, complaintsRes, menuRes] = await Promise.allSettled([
          inventoryAPI.getStats(),
          inventoryAPI.getLowStock(),
          inventoryAPI.getExpiringSoon(7),
          attendanceAPI.getWeeklyTrend(),
          purchasesAPI.getMonthlyExpenses(),
          inventoryAPI.getAll(),
          attendanceAPI.getStats(),
          complaintsAPI.getAll(),
          menuAPI.getAll(),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (lowStockRes.status === 'fulfilled') setLowStock(lowStockRes.value.data);
        if (expiringRes.status === 'fulfilled') setExpiring(expiringRes.value.data);

        if (trendRes.status === 'fulfilled' && trendRes.value.data) {
          setWeeklyAttendance(transformAttendanceTrend(trendRes.value.data));
        }

        if (expensesRes.status === 'fulfilled' && expensesRes.value.data) {
          const formatted = expensesRes.value.data.map((item: any) => {
            const date = new Date(item.month + '-02');
            const monthName = date.toLocaleDateString('en-IN', { month: 'short' });
            return { month: monthName, amount: item.amount };
          });
          setMonthlyExpenses(formatted);
        }

        if (invRes.status === 'fulfilled' && invRes.value.data) {
          const sums: Record<string, number> = {};
          invRes.value.data.forEach((i: any) => {
            const name = i.product?.name || 'Unknown';
            sums[name] = (sums[name] || 0) + i.quantity;
          });
          const chartData = Object.entries(sums)
            .map(([name, qty]) => ({ productName: name, quantity: qty }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
          setStockTrend(chartData);
        }

        // Warden: today's headcount from attendance stats
        if (attendanceStatsRes.status === 'fulfilled') {
          setTodayHeadcount(attendanceStatsRes.value.data?.todayTotal ?? 0);
        }

        // Warden: unresolved complaint count
        if (complaintsRes.status === 'fulfilled') {
          const all: any[] = complaintsRes.value.data || [];
          setUnresolvedComplaints(all.filter((c: any) => c.status === 'PENDING').length);
        }

        // Student: today's menu — group by meal
        if (menuRes.status === 'fulfilled') {
          const todayStr = new Date().toISOString().split('T')[0];
          const all: any[] = menuRes.value.data || [];
          const todayEntries = all.filter((m: any) =>
            new Date(m.date).toISOString().split('T')[0] === todayStr
          );
          const menuMap: Record<string, string> = {};
          todayEntries.forEach((m: any) => {
            try {
              const items: string[] = JSON.parse(m.items);
              menuMap[m.meal] = items.join(', ');
            } catch {
              menuMap[m.meal] = m.items;
            }
          });
          setTodayMenu(menuMap);
        }

      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const lowStockCount = stats?.lowStockCount ?? lowStock.length;
  const expiringCount = stats?.expiringSoonCount ?? expiring.length;
  const totalItems = stats?.totalItems ?? 0;
  const totalValue = stats ? formatCurrency(stats.totalInventoryValue ?? 0) : '₹0.00';
  const activeRole = user?.role || 'STUDENT_VIEWER';

  return (
    <div className="space-y-6 animate-in">
      {/* Live Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {activeRole.replace('_', ' ')}
            </span>
            <span className="text-xs text-muted-foreground">• JKKM Mess ERP Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <p className="text-muted-foreground text-sm font-medium">
            {currentTime.toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live • {currentTime.toLocaleTimeString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          ROLE-BASED DASHBOARDS
          ────────────────────────────────────────────────────────────────────────── */}

      {/* 1. SUPER_ADMIN DASHBOARD */}
      {activeRole === 'SUPER_ADMIN' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Inventory Items" value={totalItems} subtitle="Seeded items in system" icon={<Package className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="System Roles Active" value={7} subtitle="Role Profiles configured" icon={<ShieldAlert className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Active Low Stock Alerts" value={lowStockCount} subtitle="Items requiring reorder" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
            <StatsCard title="Total Valuation" value={totalValue} subtitle="Estimated total stock value" icon={<IndianRupee className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" /> Admin Quick Actions
              </h3>
              <p className="text-sm text-muted-foreground">Perform global administrative operations and user management tasks.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Link href="/dashboard/users" className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <span className="text-sm font-semibold group-hover:text-primary">Manage Users</span>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </Link>
                <Link href="/dashboard/settings" className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <span className="text-sm font-semibold group-hover:text-primary">System Settings</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </Link>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-3">
              <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> System Accounts
              </h3>
              <p className="text-sm text-muted-foreground">Standard seeded roles ready for deployment testing:</p>
              <ul className="text-xs space-y-1.5 text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                <li>• **Mess Manager**: `messmanager@jkkm.edu.in`</li>
                <li>• **Storekeeper**: `storekeeper@jkkm.edu.in`</li>
                <li>• **Kitchen Staff**: `kitchen@jkkm.edu.in`</li>
                <li>• **Accountant**: `accounts@jkkm.edu.in`</li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* 2. MESS_MANAGER DASHBOARD */}
      {activeRole === 'MESS_MANAGER' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Inventory Items" value={totalItems} subtitle="Categories managed" icon={<Package className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Low Stock Warnings" value={lowStockCount} subtitle="Needs PO immediately" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
            <StatsCard title="Expiring Soon (7d)" value={expiringCount} subtitle="Needs kitchen dispatch" icon={<Clock className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Portfolio Valuation" value={totalValue} subtitle="Estimated total stock value" icon={<IndianRupee className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
              <h3 className="font-bold text-foreground text-md mb-4 flex items-center justify-between">
                <span>Stock Level Trends</span>
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </h3>
               <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stockTrend}>
                  <defs>
                    <linearGradient id="riceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(224,76%,58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(224,76%,58%)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="productName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="quantity" name="Quantity" stroke="hsl(224,76%,58%)" fill="url(#riceGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-foreground text-md mb-2">Manager Quick Actions</h3>
                <p className="text-xs text-muted-foreground mb-4">Core shortcuts for hostel mess supervisors:</p>
                <div className="space-y-2">
                  <Link href="/dashboard/purchases" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                    <ClipboardList className="w-4 h-4 text-primary" /> Review Purchase Orders
                  </Link>
                  <Link href="/dashboard/reports" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                    <FileText className="w-4 h-4 text-primary" /> Download Valuation Reports
                  </Link>
                </div>
              </div>
              {lowStockCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs mt-4">
                  ⚠️ **Action Needed:** {lowStockCount} items require re-ordering. Please verify current quotes and dispatch Purchase Orders.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 3. STORE_KEEPER DASHBOARD */}
      {activeRole === 'STORE_KEEPER' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Total Stock Items" value={totalItems} subtitle="Available in store" icon={<Package className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Low Stock Warnings" value={lowStockCount} subtitle="Needs PO immediately" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
            <StatsCard title="Expiring Soon (7d)" value={expiringCount} subtitle="Check batch codes" icon={<Clock className="w-5 h-5" />} variant="warning" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> Storekeeper Operations
              </h3>
              <p className="text-sm text-muted-foreground">Manage incoming goods, update inventory levels, and process scans.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/dashboard/barcode" className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted border border-border hover:bg-primary/5 hover:border-primary/30 transition-all text-center">
                  <Camera className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-semibold">Barcode Station</span>
                </Link>
                <Link href="/dashboard/inventory" className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted border border-border hover:bg-primary/5 hover:border-primary/30 transition-all text-center">
                  <Plus className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-semibold">Add Manual Stock</span>
                </Link>
                <Link href="/dashboard/purchases" className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted border border-border hover:bg-primary/5 hover:border-primary/30 transition-all text-center">
                  <ClipboardList className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm font-semibold">Create PO</span>
                </Link>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-3">
              <h3 className="font-bold text-foreground text-md">Stock Alerts</h3>
              <div className="space-y-2 text-xs">
                {lowStockCount > 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded">
                    ⚠️ {lowStockCount} items below limit.
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded">
                    ✅ All core stock levels are normal.
                  </div>
                )}
                {expiringCount > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded">
                    ⏰ {expiringCount} items expiring within 7 days.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 4. KITCHEN_STAFF DASHBOARD */}
      {activeRole === 'KITCHEN_STAFF' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Expiring Soon (7d)" value={expiringCount} subtitle="Ingredients to dispatch first" icon={<Clock className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Pending Kitchen Issues" value={0} subtitle="Requested stock logs" icon={<ChefHat className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Daily Meals Configured" value={4} subtitle="Breakfast, Lunch, Snacks, Dinner" icon={<Calendar className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
              <h3 className="font-semibold text-foreground text-md mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" /> Daily Headcount Attendance Trends
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="lunch" name="Lunch Headcount" fill="hsl(28,95%,50%)" radius={[3,3,0,0]} />
                  <Bar dataKey="dinner" name="Dinner Headcount" fill="hsl(142,71%,45%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Kitchen Staff Actions</h3>
              <p className="text-xs text-muted-foreground">Log ingredients used for cooking and report food waste daily:</p>
              <div className="space-y-2">
                <Link href="/dashboard/kitchen" className="flex items-center gap-2 p-2.5 rounded bg-primary text-white hover:bg-primary/95 text-sm font-semibold transition-all">
                  <Plus className="w-4 h-4" /> Issue Ingredients for Meal
                </Link>
                <Link href="/dashboard/wastage" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                  <Trash2 className="w-4 h-4 text-primary" /> Log Food Wastage
                </Link>
                <Link href="/dashboard/menu" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                  <Calendar className="w-4 h-4 text-primary" /> View Today's Menu
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 5. ACCOUNTANT DASHBOARD */}
      {activeRole === 'ACCOUNTANT' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Total Inventory Value" value={totalValue} subtitle="Estimated total stock value" icon={<IndianRupee className="w-5 h-5" />} variant="success" isLoading={loading} />
            <StatsCard title="Pending Purchases" value={0} subtitle="Unbilled orders" icon={<ClipboardList className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Low Stock Items" value={lowStockCount} subtitle="Requires PO" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
              <h3 className="font-bold text-foreground text-md mb-4 flex items-center justify-between">
                <span>Monthly Purchase Expenses</span>
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Spend" fill="hsl(224,76%,58%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Financial Actions</h3>
              <p className="text-xs text-muted-foreground">Download financial statements and review active supplier invoices:</p>
              <div className="space-y-2">
                <Link href="/dashboard/reports" className="flex items-center gap-2 p-2.5 rounded bg-primary text-white hover:bg-primary/95 text-sm font-semibold transition-all">
                  <FileText className="w-4 h-4" /> Download Excel Reports
                </Link>
                <Link href="/dashboard/purchases" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                  <ClipboardList className="w-4 h-4 text-primary" /> Audit Purchase Orders
                  </Link>
                </div>
              </div>
          </section>
        </div>
      )}

      {/* 6. HOSTEL_WARDEN DASHBOARD */}
      {activeRole === 'HOSTEL_WARDEN' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Today's Meal Headcount" value={todayHeadcount} subtitle="Total students served today" icon={<ChefHat className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Unresolved Complaints" value={unresolvedComplaints} subtitle="Pending student complaints" icon={<MessageSquare className="w-5 h-5" />} variant={unresolvedComplaints > 0 ? 'danger' : 'success'} isLoading={loading} />
            <StatsCard title="Attendance Logged" value={todayHeadcount > 0 ? 'Done' : 'Pending'} subtitle="Daily headcount entry status" icon={<CheckCircle className="w-5 h-5" />} variant={todayHeadcount > 0 ? 'success' : 'warning'} isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
              <h3 className="font-semibold text-foreground text-md mb-4">Student Headcount Trends</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="lunch" name="Lunch Attendance" fill="hsl(28,95%,50%)" radius={[3,3,0,0]} />
                  <Bar dataKey="dinner" name="Dinner Attendance" fill="hsl(142,71%,45%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Warden Administration</h3>
              <p className="text-xs text-muted-foreground">Manage student meal headcounts and review mess quality complaints:</p>
              <div className="space-y-2">
                <Link href="/dashboard/attendance" className="flex items-center gap-2 p-2.5 rounded bg-primary text-white hover:bg-primary/95 text-sm font-semibold transition-all">
                  <ListTodo className="w-4 h-4" /> Log Today's Headcount
                </Link>
                <Link href="/dashboard/complaints" className="flex items-center gap-2 p-2.5 rounded bg-muted hover:bg-muted/80 text-sm font-semibold border border-border">
                  <MessageSquare className="w-4 h-4 text-primary" /> View Student Complaints
                  {unresolvedComplaints > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unresolvedComplaints}</span>
                  )}
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 7. STUDENT_VIEWER DASHBOARD */}
      {activeRole === 'STUDENT_VIEWER' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Menu Widget — live from API */}
            <div className="md:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" /> Today's Mess Menu
              </h3>
              <p className="text-xs text-muted-foreground">Menu for {currentTime.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}:</p>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {['Breakfast', 'Lunch', 'Dinner'].map(m => (
                    <div key={m} className="bg-muted/55 border border-border p-4 rounded-xl animate-pulse h-24" />
                  ))}
                </div>
              ) : Object.keys(todayMenu).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {['BREAKFAST', 'LUNCH', 'DINNER'].map((meal) => (
                    todayMenu[meal] ? (
                      <div key={meal} className="bg-muted/55 border border-border p-4 rounded-xl space-y-2">
                        <span className="text-xs font-black uppercase text-primary tracking-wider">{meal.charAt(0) + meal.slice(1).toLowerCase()}</span>
                        <p className="text-sm font-bold text-foreground">{todayMenu[meal]}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-border">
                  <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Today's menu has not been posted yet.</p>
                  <p className="text-xs mt-1">Check back after breakfast hours.</p>
                </div>
              )}
            </div>

            {/* Student Actions */}
            <div className="bg-card border border-border p-6 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Student Support
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Submit suggestions or file complaints regarding food quality or hygiene:</p>
                <div className="space-y-2">
                  <Link href="/dashboard/complaints" className="flex items-center justify-between p-3 rounded-lg bg-primary hover:bg-primary/95 text-white text-sm font-semibold transition-all">
                    <span>Submit Complaint</span>
                    <Plus className="w-4 h-4" />
                  </Link>
                  <Link href="/dashboard/menu" className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border hover:bg-muted/80 text-sm font-semibold transition-all">
                    <span>Full Weekly Menu</span>
                    <Calendar className="w-4 h-4 text-primary" />
                  </Link>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground bg-muted p-2.5 rounded border border-border mt-4">
                ℹ️ Wardens review all submitted complaints daily at 9:00 PM.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
