'use client';
import { useEffect, useState } from 'react';
import { attendanceAPI } from '@/lib/api';
import { Calendar, Users, Plus, CheckCircle2, TrendingUp, AlertCircle, Building, Clock } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AttendanceLog {
  id: number;
  date: string;
  meal: string;
  count: number;
  hostel?: string;
  notes?: string;
  createdAt: string;
}



const transformAttendanceTrend = (records: any[]) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap: Record<string, { day: string; Breakfast: number; Lunch: number; Dinner: number; Snack: number }> = {};
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    dayMap[dateStr] = { day: dayName, Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
  }

  records.forEach((r) => {
    const dateStr = new Date(r.date).toISOString().split('T')[0];
    if (dayMap[dateStr]) {
      const mealKey = r.meal.toUpperCase();
      if (mealKey === 'BREAKFAST') dayMap[dateStr].Breakfast += r.count;
      else if (mealKey === 'LUNCH') dayMap[dateStr].Lunch += r.count;
      else if (mealKey === 'DINNER') dayMap[dateStr].Dinner += r.count;
      else if (mealKey === 'SNACK') dayMap[dateStr].Snack += r.count;
    }
  });

  return Object.values(dayMap);
};

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayCount: 0, weeklyAvg: 0, peakCount: 0 });
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meal, setMeal] = useState('LUNCH');
  const [count, setCount] = useState('');
  const [hostel, setHostel] = useState('All Hostels');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes, trendRes] = await Promise.all([
        attendanceAPI.getAll(15),
        attendanceAPI.getStats(),
        attendanceAPI.getWeeklyTrend()
      ]);
      if (logsRes.data) setLogs(logsRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (trendRes.data && trendRes.data.length > 0) {
        setWeeklyData(transformAttendanceTrend(trendRes.data));
      }
    } catch (e) {
      console.error('Failed to fetch attendance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!count || isNaN(Number(count)) || Number(count) <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid count.' });
      return;
    }

    try {
      const payload = {
        date: new Date(date).toISOString(),
        meal,
        count: parseInt(count, 10),
        hostel,
        notes
      };
      const res = await attendanceAPI.create(payload);
      if (res.data) {
        setStatusMsg({ type: 'success', text: 'Attendance logged successfully!' });
        setCount('');
        setNotes('');
        fetchAttendance(); // refresh list
      }
    } catch (error: any) {
      setStatusMsg({ type: 'error', text: error.response?.data?.message || 'Failed to log headcount.' });
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Attendance Stats Cards */}
      <section aria-label="Attendance Summary Statistics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Today's Headcount</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Across all active hostels</p>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsl(28,95%,15%)] text-[hsl(28,95%,55%)]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.weeklyAvg}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Weekly Average</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Expected daily headcount</p>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/15 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.peakCount}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Peak Count (This Week)</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Max demand during LUNCH</p>
          </div>
        </div>
      </section>

      {/* Grid: Chart & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">Weekly Meal Headcount Trends</h3>
            <p className="text-xs text-muted-foreground mb-4">Daily meal distribution across breakfast, lunch, and dinner</p>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Breakfast" fill="hsl(224,76%,58%)" name="Breakfast" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Lunch" fill="hsl(28,95%,50%)" name="Lunch" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Dinner" fill="hsl(142,71%,45%)" name="Dinner" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Record Headcount Form */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-base mb-1">Record Headcount</h3>
          <p className="text-xs text-muted-foreground mb-4">Input actual meal intake counts manually</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Intake Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Meal Session</label>
              <div className="grid grid-cols-3 gap-2">
                {['BREAKFAST', 'LUNCH', 'DINNER'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeal(m)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium border capitalize transition-all',
                      meal === m
                        ? 'bg-primary text-white border-primary'
                        : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Student Headcount</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  placeholder="e.g. 450"
                  value={count}
                  onChange={e => setCount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Hostel Wing</label>
              <select
                value={hostel}
                onChange={e => setHostel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="All Hostels">All Hostels (Consolidated)</option>
                <option value="Boys Hostel A">Boys Hostel A</option>
                <option value="Boys Hostel B">Boys Hostel B</option>
                <option value="Girls Hostel">Girls Hostel</option>
                <option value="PG Hostel">PG Hostel & Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Remarks / Notes</label>
              <textarea
                placeholder="Special instructions or events..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-16 resize-none"
              />
            </div>

            {statusMsg && (
              <div className={cn(
                'p-3 rounded-lg flex items-center gap-2 text-xs',
                statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Log Headcount
            </button>
          </form>
        </div>
      </div>

      {/* Recent Headcount Logs Table */}
      <section aria-label="Recent Attendance Logs" className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground text-base mb-1">Recent Attendance Logs</h3>
        <p className="text-xs text-muted-foreground mb-4">Historical record of registered counts</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2.5 font-semibold">Session Date</th>
                <th className="py-2.5 font-semibold">Meal</th>
                <th className="py-2.5 font-semibold">Hostel / Location</th>
                <th className="py-2.5 font-semibold text-right">Headcount</th>
                <th className="py-2.5 font-semibold pl-6">Notes</th>
                <th className="py-2.5 font-semibold text-right">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 flex items-center gap-2 text-foreground font-medium">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatDate(log.date)}
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider',
                      log.meal === 'BREAKFAST' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      log.meal === 'LUNCH' && 'bg-[hsl(28,95%,15%)] text-[hsl(28,95%,55%)] border-[hsl(28,95%,20%)]',
                      log.meal === 'DINNER' && 'bg-green-500/10 text-green-400 border-green-500/20'
                    )}>
                      {log.meal}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {log.hostel || 'All Hostels'}
                  </td>
                  <td className="py-3 text-right text-foreground font-bold">{log.count}</td>
                  <td className="py-3 text-muted-foreground/80 pl-6 italic">{log.notes || '—'}</td>
                  <td className="py-3 text-right text-muted-foreground flex items-center justify-end gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground/50" />
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
