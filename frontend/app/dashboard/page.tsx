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
  const totalCategories = stats?.totalCategories ?? 0;
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
            <StatsCard title="System Roles Active" value={3} subtitle="Role Profiles configured" icon={<ShieldAlert className="w-5 h-5" />} variant="warning" isLoading={loading} />
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
              <p className="text-sm text-muted-foreground">Standard active roles ready for deployment testing:</p>
              <ul className="text-xs space-y-1.5 text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
                <li>• **Super Admin**: `admin@jkkm.edu.in`</li>
                <li>• **Mess Manager**: `messmanager@jkkm.edu.in`</li>
                <li>• **Hostel Warden**: `warden@jkkm.edu.in`</li>
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
                      <stop offset="5%" stopColor="hsl(224,76%,58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(224,76%,58%)" stopOpacity={0} />
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
                <h3 className="font-bold text-foreground text-md mb-2">Manager Operations</h3>
                <p className="text-xs text-muted-foreground mb-4">Core shortcuts for hostel mess supervisors:</p>
                <div className="space-y-2">
                  <Link href="/dashboard/barcode" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <Camera className="w-4 h-4 text-primary flex-shrink-0" /> Barcode Stock Entry (Groceries)
                  </Link>
                  <Link href="/dashboard/inventory" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" /> Vegetables Manual Stock Entry
                  </Link>
                  <Link href="/dashboard/kitchen" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <ChefHat className="w-4 h-4 text-primary flex-shrink-0" /> Daily Cooking Stock Issues
                  </Link>
                  <Link href="/dashboard/purchases" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" /> Review Purchase Orders
                  </Link>
                  <Link href="/dashboard/reports" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" /> Stock Valuation Reports
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

      {/* 3. HOSTEL_WARDEN DASHBOARD */}
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
                  <Bar dataKey="lunch" name="Lunch Attendance" fill="hsl(28,95%,50%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="dinner" name="Dinner Attendance" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Warden Administration</h3>
              <p className="text-xs text-muted-foreground">Manage student meal headcounts, complaints, and update the menu schedule:</p>
              <div className="space-y-2">
                <Link href="/dashboard/attendance" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline border-0 outline-none cursor-pointer select-none">
                  <ListTodo className="w-4 h-4 flex-shrink-0" /> Log Today's Headcount
                </Link>
                <Link href="/dashboard/complaints" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" /> Resolve Student Complaints
                  {unresolvedComplaints > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unresolvedComplaints}</span>
                  )}
                </Link>
                <Link href="/dashboard/menu" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" /> Update Daily Menu Plan
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 4. STOREKEEPER DASHBOARD */}
      {['STOREKEEPER', 'STORE_KEEPER'].includes(activeRole) && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Packaged Items" value={totalItems} subtitle="Seeded items in system" icon={<Package className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Low Stock Warnings" value={lowStockCount} subtitle="Needs PO immediately" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
            <StatsCard title="Expiring Soon (7d)" value={expiringCount} subtitle="Needs kitchen dispatch" icon={<Clock className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Portfolio Valuation" value={totalValue} subtitle="Estimated total stock value" icon={<IndianRupee className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-foreground text-md mb-2">Storekeeper Quick Actions</h3>
                <p className="text-xs text-muted-foreground mb-4">Core tools for inventory arrivals and dispatches:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link href="/dashboard/barcode" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <Camera className="w-4 h-4 flex-shrink-0" /> Barcode Scanner Entry
                  </Link>
                  <Link href="/dashboard/inventory" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" /> Vegetables Manual Entry
                  </Link>
                  <Link href="/dashboard/products" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <Package className="w-4 h-4 text-primary flex-shrink-0" /> View Products Catalog
                  </Link>
                  <Link href="/dashboard/purchases" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] text-sm font-semibold transition-all no-underline cursor-pointer select-none">
                    <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" /> Review Purchase Orders
                  </Link>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col justify-center">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Stock Watch
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                You have {lowStockCount} items below minimum warning thresholds. Perform standard scans or PO auto-drafts to receive new inventory.
              </p>
              {lowStockCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ Alert: Low stocks detected!
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 5. KITCHEN_STAFF DASHBOARD */}
      {activeRole === 'KITCHEN_STAFF' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard title="Daily Menu Status" value={Object.keys(todayMenu).length > 0 ? "Uploaded" : "Not Set"} subtitle="Today's menu details" icon={<Calendar className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Expiring Soon (7d)" value={expiringCount} subtitle="Needs kitchen dispatch" icon={<Clock className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Low Stock Ingredients" value={lowStockCount} subtitle="Items below limits" icon={<AlertTriangle className="w-5 h-5" />} variant="danger" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground text-md">Today's Cooking Schedule</h3>
              {Object.keys(todayMenu).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No menu logs uploaded for today yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(todayMenu).map(([meal, items]) => (
                    <div key={meal} className="p-3 bg-muted border border-border rounded-lg">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{meal}</p>
                      <p className="text-sm text-foreground font-semibold mt-1">{items}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Kitchen Operations</h3>
              <p className="text-xs text-muted-foreground">Standard shortcuts for culinary logs:</p>
              <div className="space-y-2">
                <Link href="/dashboard/kitchen" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline border-0 outline-none cursor-pointer select-none">
                  <ChefHat className="w-4 h-4 flex-shrink-0" /> Log Ingredient Dispatches
                </Link>
                <Link href="/dashboard/barcode" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                  <Camera className="w-4 h-4 text-primary flex-shrink-0" /> Verify Batch Expiries
                </Link>
                <Link href="/dashboard/menu" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" /> View Detailed Planner
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 6. ACCOUNTANT DASHBOARD */}
      {activeRole === 'ACCOUNTANT' && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Portfolio Valuation" value={totalValue} subtitle="Estimated total stock value" icon={<IndianRupee className="w-5 h-5" />} variant="success" isLoading={loading} />
            <StatsCard title="Total Categories" value={totalCategories} subtitle="Active catalog items" icon={<Package className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Reorder Requirements" value={lowStockCount} subtitle="Active low stock metrics" icon={<AlertTriangle className="w-5 h-5" />} variant="warning" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
              <h3 className="font-semibold text-foreground text-md mb-4 flex items-center justify-between">
                <span>Recent Operations Expense Trends</span>
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
              </h3>
              {monthlyExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No expense logs calculated for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyExpenses}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" name="Expense (₹)" fill="hsl(142,71%,45%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-foreground text-md">Accounting Operations</h3>
                <p className="text-xs text-muted-foreground mb-4">Financial auditing and PO reconciliation shortcuts:</p>
                <div className="space-y-2">
                  <Link href="/dashboard/reports" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline border-0 outline-none cursor-pointer select-none">
                    <FileText className="w-4 h-4 flex-shrink-0" /> Valuation & Spend Reports
                  </Link>
                  <Link href="/dashboard/purchases" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                    <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" /> Review Purchase Orders
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 7. STUDENT & STUDENT_VIEWER DASHBOARD */}
      {['STUDENT', 'STUDENT_VIEWER'].includes(activeRole) && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Daily Menu Setup" value={Object.keys(todayMenu).length > 0 ? "Configured" : "Not Set"} subtitle="Today's meal list ready" icon={<Calendar className="w-5 h-5" />} variant="primary" isLoading={loading} />
            <StatsCard title="Active Complaints" value={unresolvedComplaints} subtitle="Tickets being checked" icon={<MessageSquare className="w-5 h-5" />} variant="warning" isLoading={loading} />
            <StatsCard title="Kitchen Rating" value="A+ Verified" subtitle="Quality assurance standard" icon={<CheckCircle className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground text-md">Today's Menu Schedule</h3>
              {Object.keys(todayMenu).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No menu logs uploaded for today yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(todayMenu).map(([meal, items]) => (
                    <div key={meal} className="p-3 bg-muted border border-border rounded-lg">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{meal}</p>
                      <p className="text-sm text-foreground font-semibold mt-1">{items}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-border p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-foreground text-md">Student Operations</h3>
              <p className="text-xs text-muted-foreground">Shortcuts for student hostel viewer tools:</p>
              <div className="space-y-2">
                <Link href="/dashboard/complaints" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline border-0 outline-none cursor-pointer select-none">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" /> File a New Complaint
                </Link>
                <Link href="/dashboard/menu" className="inline-flex items-center justify-start gap-2.5 px-4 py-3 rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 hover:scale-[1.01] active:scale-[0.99] w-full text-sm font-semibold transition-all no-underline outline-none cursor-pointer select-none">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" /> View Complete Weekly Menu
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 8. GENERAL DEFAULTS FALLBACK */}
      {!['SUPER_ADMIN', 'MESS_MANAGER', 'HOSTEL_WARDEN', 'STOREKEEPER', 'STORE_KEEPER', 'KITCHEN_STAFF', 'ACCOUNTANT', 'STUDENT', 'STUDENT_VIEWER'].includes(activeRole) && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Connection Status" value="Online" subtitle="Database pooler active" icon={<CheckCircle className="w-5 h-5" />} variant="success" isLoading={loading} />
          </section>
        </div>
      )}
    </div>
  );
}
