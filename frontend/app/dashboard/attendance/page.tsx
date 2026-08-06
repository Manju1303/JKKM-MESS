'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { attendanceAPI } from '@/lib/api';
import {
  Calendar, Users, Plus, CheckCircle2, TrendingUp, AlertCircle, Building, Clock,
  Camera, Keyboard, X, FlipHorizontal, QrCode
} from 'lucide-react';
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
  const [, setLoading] = useState(true);

  // Mode Selection State
  const [entryMode, setEntryMode] = useState<'MANUAL' | 'SCANNER'>('MANUAL');

  // Manual Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meal, setMeal] = useState('LUNCH');
  const [count, setCount] = useState('');
  const [hostel, setHostel] = useState('All Hostels');
  const [notes, setNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scanner (Mobile Barcode) State
  const [studentBarcode, setStudentBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scannerMsg, setScannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanControlsRef = useRef<any>(null);

  // Audio beeper interface
  const playBeep = (type: 'success' | 'error') => {
    try {
      const SoundCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new SoundCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(850, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch { }
  };

  const stopCamera = useCallback(() => {
    if (scanControlsRef.current) {
      try { scanControlsRef.current.stop(); } catch { }
      scanControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopScanning = useCallback(() => {
    stopCamera();
    setIsScanning(false);
    setScanStatus('');
    setCameraError('');
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const fetchAttendance = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleScanSubmit = async (barcodeVal: string) => {
    const code = barcodeVal.trim();
    if (!code) return;
    try {
      setScannerMsg(null);
      const res = await attendanceAPI.registerScan(code, hostel === 'All Hostels' ? 'All Hostels' : hostel);
      if (res.data) {
        setScannerMsg({ type: 'success', text: `Approved: ${res.data.message} (Count: ${res.data.totalCount})` });
        playBeep('success');
        setStudentBarcode('');
        fetchAttendance(); // refresh chart
      }
    } catch (err: any) {
      setScannerMsg({
        type: 'error',
        text: err.response?.data?.message || `Failed to log scan for ID: ${code}`
      });
      playBeep('error');
    }
  };

  const startScanning = async (facing: 'environment' | 'user' = cameraFacing) => {
    setIsScanning(true);
    setCameraError('');
    setScanStatus('Starting camera…');
    stopCamera();

    await new Promise(r => setTimeout(r, 200));

    if (!videoRef.current) {
      setCameraError('Video object not ready.');
      setIsScanning(false);
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const codeReader = new BrowserMultiFormatReader();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setScanStatus('Camera active — scan student card');
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => { });

      const controls = await codeReader.decodeFromStream(
        stream,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            controls.stop();
            scanControlsRef.current = null;
            stopCamera();
            setIsScanning(false);
            setScanStatus('');
            handleScanSubmit(text);
          }
        }
      );
      scanControlsRef.current = controls;
    } catch (e: any) {
      console.error(e);
      stopCamera();
      setIsScanning(false);
      setScanStatus('');
      setCameraError('Permission denied or camera busy.');
    }
  };

  const flipCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isScanning) {
      startScanning(nextFacing);
    }
  };

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
            <p className="text-sm text-muted-foreground mt-0.5">Today&apos;s Headcount</p>
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

        {/* Record Headcount Form / Scanner */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="flex border-b border-border mb-4">
            <button
              onClick={() => { stopScanning(); setEntryMode('MANUAL'); }}
              className={cn(
                "flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer",
                entryMode === 'MANUAL' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> Manual Entry</span>
            </button>
            <button
              onClick={() => { setEntryMode('SCANNER'); }}
              className={cn(
                "flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer",
                entryMode === 'SCANNER' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center justify-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> Scan ID Card</span>
            </button>
          </div>

          {entryMode === 'MANUAL' ? (
            <>
              <h3 className="font-semibold text-foreground text-sm mb-1">Record Headcount</h3>
              <p className="text-[11px] text-muted-foreground mb-4 font-normal">Input actual meal intake counts manually</p>

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
                          'py-1.5 rounded-lg text-xs font-medium border capitalize transition-all cursor-pointer',
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
                    'p-3 rounded-lg flex items-center gap-2 text-xs border',
                    statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  )}>
                    {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Log Headcount
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-sm mb-1">Mobile Scanner Entry</h3>
              <p className="text-[11px] text-muted-foreground mb-4 font-normal">Point mobile camera at student card barcode or use keyboard key-in</p>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Hostel Location</label>
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

              {/* Camera Scanner View */}
              {isScanning ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-border">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                  <div className="absolute inset-0 border border-primary/40 pointer-events-none flex items-center justify-center">
                    <div className="w-40 h-20 border border-dashed border-primary animate-pulse" />
                  </div>
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <button
                      onClick={flipCamera}
                      className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-all cursor-pointer"
                      title="Flip Camera"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={stopScanning}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] bg-black/60 text-white py-0.5 rounded">
                    {scanStatus}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startScanning('environment')}
                  className="w-full py-6 rounded-lg border border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-2 group text-primary cursor-pointer font-bold"
                >
                  <Camera className="w-8 h-8 group-hover:scale-105 transition-transform" />
                  <span className="text-xs">Start Camera Scanner</span>
                </button>
              )}

              {cameraError && (
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-[10px] flex items-start gap-1 border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Key Wedge barcode reader / bluetooth card interface */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Scan or type student code..."
                  value={studentBarcode}
                  onChange={e => setStudentBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleScanSubmit(studentBarcode);
                    }
                  }}
                  className="w-full pl-10 pr-20 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleScanSubmit(studentBarcode)}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/95 transition-all cursor-pointer"
                >
                  Log
                </button>
              </div>

              {scannerMsg && (
                <div className={cn(
                  "p-3 rounded-lg flex items-start gap-2 text-xs border mr-1",
                  scannerMsg.type === 'success' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {scannerMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="font-semibold text-foreground">{scannerMsg.text}</span>
                </div>
              )}
            </div>
          )}
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
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
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
