'use client';
import { useEffect, useState } from 'react';
import { aiAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Brain, AlertTriangle, TrendingUp, Cpu, Sparkles, BarChart3, Info, HelpCircle, RefreshCw,
  Users, Trash2, Gauge, Clock, Calendar, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie
} from 'recharts';

// ── Mock Fallback Data matching backend mock structure ───────────────────────
const mockInsights = {
  summary: {
    criticalItems: 2,
    highUrgencyItems: 3,
    spendingAnomalies: 1,
    topConsumerProduct: 'Ponni Rice',
    prepEfficiency: 92,
    wastedCost: 12450,
  },
  reorderSuggestions: [
    { productId: 1, productName: 'Ponni Rice', currentStock: 320, minRequired: 500, unit: 'KG', suggestedOrderQty: 600, urgency: 'HIGH' },
    { productId: 2, productName: 'Toor Dal', currentStock: 82, minRequired: 100, unit: 'KG', suggestedOrderQty: 150, urgency: 'MEDIUM' },
    { productId: 5, productName: 'Sunflower Oil', currentStock: 0, minRequired: 50, unit: 'LITRE', suggestedOrderQty: 80, urgency: 'CRITICAL' },
  ],
  anomalies: [
    { purchaseNumber: 'PO-2026-0520', netAmount: 185000, purchaseDate: '2026-05-20', supplierId: 3, zScore: 2.45, isHigh: true, supplierName: 'Sri Balaji Traders' },
  ],
  predictions: [
    { productId: 1, productName: 'Ponni Rice', unit: 'KG', avgDailyUsage: 45.5, predicted7DayNeed: 318.5, recommendedOrderQty: 382.2 },
    { productId: 2, productName: 'Toor Dal', unit: 'KG', avgDailyUsage: 12.3, predicted7DayNeed: 86.1, recommendedOrderQty: 103.3 },
    { productId: 3, productName: 'Atta (Flour)', unit: 'KG', avgDailyUsage: 18.2, predicted7DayNeed: 127.4, recommendedOrderQty: 152.9 },
    { productId: 4, productName: 'Potato', unit: 'KG', avgDailyUsage: 25.0, predicted7DayNeed: 175.0, recommendedOrderQty: 210.0 },
    { productId: 5, productName: 'Sunflower Oil', unit: 'LITRE', avgDailyUsage: 8.5, predicted7DayNeed: 59.5, recommendedOrderQty: 71.4 },
  ],
  stockRunout: [
    { productId: 1, productName: 'Ponni Rice', currentStock: 320, unit: 'KG', avgDailyUsage: 45.5, daysRemaining: 7.0, urgency: 'HIGH' },
    { productId: 2, productName: 'Toor Dal', currentStock: 82, unit: 'KG', avgDailyUsage: 12.3, daysRemaining: 6.7, urgency: 'HIGH' },
    { productId: 3, productName: 'Atta (Flour)', currentStock: 250, unit: 'KG', avgDailyUsage: 18.2, daysRemaining: 13.7, urgency: 'NORMAL' },
    { productId: 4, productName: 'Potato', currentStock: 18, unit: 'KG', avgDailyUsage: 25.0, daysRemaining: 0.7, urgency: 'CRITICAL' },
    { productId: 5, productName: 'Sunflower Oil', currentStock: 0, unit: 'LITRE', avgDailyUsage: 8.5, daysRemaining: 0, urgency: 'CRITICAL' },
  ],
  seasonal: {
    weekdayAvgQuantity: 114.5,
    weekendAvgQuantity: 82.3,
    mealAverages: [
      { meal: 'BREAKFAST', avgQuantity: 28.5 },
      { meal: 'LUNCH', avgQuantity: 42.1 },
      { meal: 'DINNER', avgQuantity: 39.8 },
      { meal: 'SNACK', avgQuantity: 12.6 },
    ],
    insights: [
      'Weekday attendance spikes volume needs by ~15% due to college attendance records.',
      'Dinner represents the highest caloric consumption index.',
    ],
  },
  waste: {
    totalWastedValue: 12450,
    reasons: [
      { reason: 'EXPIRED', count: 3, value: 4500, quantity: 90 },
      { reason: 'DAMAGED', count: 2, value: 2450, quantity: 45 },
      { reason: 'OVERCOOK', count: 6, value: 5500, quantity: 120 },
    ],
    prepEfficiencyIndex: 92,
  },
};

const COLORS = ['#FF8042', '#0088FE', '#00C49F', '#FFBB28', '#8884d8'];

export default function AiInsightsPage() {
  const [activeTab, setActiveTab] = useState<'core' | 'attendance' | 'depletion' | 'seasonal' | 'waste'>('core');
  const [data, setData] = useState(mockInsights);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Attendance forecasting slider state
  const [studentCount, setStudentCount] = useState<number>(500);
  const [attendanceForecast, setAttendanceForecast] = useState<any[]>([]);
  const [forecastingLoading, setForecastingLoading] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await aiAPI.getInsights();
      if (res.data && res.data.summary) {
        // Hydrate data with API response
        setData({
          summary: res.data.summary,
          reorderSuggestions: res.data.reorderSuggestions || mockInsights.reorderSuggestions,
          anomalies: res.data.anomalies || mockInsights.anomalies,
          predictions: res.data.predictions || mockInsights.predictions,
          stockRunout: res.data.stockRunout || mockInsights.stockRunout,
          seasonal: res.data.seasonal || mockInsights.seasonal,
          waste: res.data.waste || mockInsights.waste,
        });
      }
    } catch (e) {
      console.log('Using local mock AI forecasting outputs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAttendanceForecast = async (count: number) => {
    try {
      setForecastingLoading(true);
      const res = await aiAPI.getAttendanceForecast(count);
      if (res.data && res.data.length > 0) {
        setAttendanceForecast(res.data);
      } else {
        triggerFallbackForecast(count);
      }
    } catch (e) {
      triggerFallbackForecast(count);
    } finally {
      setForecastingLoading(false);
    }
  };

  const triggerFallbackForecast = (count: number) => {
    const fallback = mockInsights.predictions.map((p, idx) => {
      const perStudentMeal = [0.095, 0.025, 0.04, 0.055, 0.018][idx] || 0.05;
      const singleMealQty = perStudentMeal * count;
      const dailyQty = singleMealQty * 3;
      return {
        productId: p.productId,
        productName: p.productName,
        unit: p.unit,
        perStudentMeal,
        predictedMealNeed: Math.round(singleMealQty * 10) / 10,
        predictedDailyNeed: Math.round(dailyQty * 10) / 10,
        predictedWeeklyNeed: Math.round(dailyQty * 7 * 10) / 10,
      };
    });
    setAttendanceForecast(fallback);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    fetchAttendanceForecast(studentCount);
  }, [studentCount]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    fetchInsights();
    fetchAttendanceForecast(studentCount);
  };

  // Recharts formatters
  const coreChartData = data.predictions.map(p => ({
    name: p.productName,
    '7-Day Demand': p.predicted7DayNeed,
    'Suggested Order': p.recommendedOrderQty,
  }));

  const seasonalChartData = data.seasonal.mealAverages.map(m => ({
    meal: m.meal,
    'Avg Quantity (KG/L)': m.avgQuantity,
  }));

  const wastePieData = data.waste.reasons.map(r => ({
    name: r.reason,
    value: r.value,
  }));

  return (
    <div className="space-y-6 animate-in">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-card border border-border rounded-xl p-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center text-white shadow-lg">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base leading-none flex items-center gap-2">
              AI Analytics & Intelligence Hub
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-semibold">
                <Sparkles className="w-2.5 h-2.5" /> Predictor v1.2
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5">Biometric attendance-based demand forecasts, wastage metrics, and inventory run-out models</p>
          </div>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center justify-center gap-2 text-xs font-semibold shadow-md active:scale-95"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Run Predictive Model
        </button>
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">{data.summary.criticalItems}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Critical Shortages</p>
            <span className="text-[10px] text-red-400/80 font-medium">Requires PO today</span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {data.stockRunout.filter(i => i.daysRemaining > 0 && i.daysRemaining <= 3).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Runout Warnings</p>
            <span className="text-[10px] text-amber-400/80 font-medium">Deficit in 72 hours</span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-500/10 text-green-400 border border-green-500/20">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">{data.summary.prepEfficiency}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prep Efficiency Index</p>
            <span className="text-[10px] text-green-400/80 font-medium">High headcount match</span>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/20 transition-all">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">{formatCurrency(data.summary.wastedCost)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly Waste Value</p>
            <span className="text-[10px] text-rose-400/80 font-medium">Expired/Overcooked</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab('core')}
          className={cn(
            'px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === 'core'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 className="w-4 h-4" /> Core Forecasting
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === 'attendance'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="w-4 h-4" /> Attendance Forecaster
        </button>
        <button
          onClick={() => setActiveTab('depletion')}
          className={cn(
            'px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === 'depletion'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Clock className="w-4 h-4" /> Depletion Tracker
        </button>
        <button
          onClick={() => setActiveTab('seasonal')}
          className={cn(
            'px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === 'seasonal'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="w-4 h-4" /> Seasonal Dynamics
        </button>
        <button
          onClick={() => setActiveTab('waste')}
          className={cn(
            'px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2',
            activeTab === 'waste'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Trash2 className="w-4 h-4" /> Wastage & Efficiency
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px]">
        {/* Tab 1: Core Forecasting & Reorders */}
        {activeTab === 'core' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in">
            {/* Predictions Chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  7-Day Projected Need vs Recommended Orders
                </h4>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Calculates predicted ingredient requirements and suggests purchase sizes incorporating a 20% safe reserve buffer.
                </p>
              </div>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coreChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="7-Day Demand" fill="hsl(224,76%,58%)" name="7-Day Demand Need" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Suggested Order" fill="hsl(28,95%,50%)" name="Suggested Purchase Size" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Reorder Suggestions */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h4 className="font-semibold text-foreground text-sm">Smart Reorder Suggestions</h4>
                <p className="text-[11px] text-muted-foreground">Auto-triggered PO calculations based on standard buffer deficits</p>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-96 pr-1 scrollbar-thin">
                {data.reorderSuggestions.map(s => (
                  <div key={s.productId} className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-foreground">{s.productName}</h5>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Stock: <span className="font-semibold text-foreground">{s.currentStock} / {s.minRequired} {s.unit}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider',
                        s.urgency === 'CRITICAL' && 'bg-red-500/10 text-red-400 border-red-500/20',
                        s.urgency === 'HIGH' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        s.urgency === 'MEDIUM' && 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      )}>
                        {s.urgency}
                      </span>
                      <p className="text-xs text-primary font-bold mt-1">PO Qty: {s.suggestedOrderQty} {s.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly list */}
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-1">
                Purchase Anomaly Detection <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
              </h4>
              <p className="text-[11px] text-muted-foreground mb-4">Calculates Z-scores of procurement amounts against historic means to prevent invoice errors.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.anomalies.map(a => (
                  <div key={a.purchaseNumber} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Statistical Outlier</span>
                      <h5 className="text-xs font-bold text-foreground mt-1">{a.purchaseNumber}</h5>
                      <p className="text-[10px] text-muted-foreground mt-1">Supplier: {a.supplierName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(a.netAmount)}</p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/15 text-red-400 border border-red-500/30 inline-block mt-1">
                        Z-Score: +{a.zScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Attendance-Based Forecasting */}
        {activeTab === 'attendance' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 animate-in">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-4 border-b border-border">
              <div className="max-w-md">
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Dynamic Student Count Forecaster
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust expected student occupancy to project the required food volume automatically based on biometric headcount consumption histories.
                </p>
              </div>
              <div className="w-full lg:w-96 p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Student Headcount</span>
                  <span className="text-xs font-bold text-primary">{studentCount} Students</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="25"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>100</span>
                  <span>650</span>
                  <span>1200</span>
                </div>
              </div>
            </div>

            {forecastingLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                Recalculating ingredient demand models...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual predicted lists */}
                <div className="lg:col-span-2 space-y-4">
                  <h5 className="text-xs font-bold text-foreground">Projected Volumes for {studentCount} Students</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {attendanceForecast.map(f => (
                      <div key={f.productId} className="p-4 rounded-xl bg-muted/20 border border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">{f.productName}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Per head/meal: <span className="font-semibold text-foreground">{(f.perStudentMeal).toFixed(3)} {f.unit}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{f.predictedMealNeed} {f.unit}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Need / Meal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bulk forecast summary card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-primary/20 text-primary font-bold border border-primary/30 uppercase tracking-widest inline-block">
                      Forecast Summary
                    </span>
                    <h5 className="text-sm font-bold text-foreground">Weekly Grocery Estimation</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      At {studentCount} students per meal, the kitchen will consume approximately:
                    </p>
                    <div className="space-y-2.5 pt-2">
                      {attendanceForecast.slice(0, 3).map(f => (
                        <div key={f.productId} className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5">
                          <span className="text-muted-foreground">{f.productName}</span>
                          <span className="font-bold text-foreground">{f.predictedWeeklyNeed} {f.unit} / week</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      Provides a reliable template for purchase orders.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Future Stock & Run-Out Predictions */}
        {activeTab === 'depletion' && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-in">
            <div>
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Linear Stock Run-out Predictions
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Calculates the estimated days of stock remaining for each catalog item by mapping current storage weight/volume against active daily consumption averages.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {data.stockRunout.map(i => {
                const isCritical = i.daysRemaining <= 2;
                const isWarning = i.daysRemaining > 2 && i.daysRemaining <= 7;
                // Calculate percentage for progress bar (max 30 days visualization)
                const percent = Math.min(100, (i.daysRemaining / 30) * 100);

                return (
                  <div key={i.productId} className="space-y-1.5 p-4 rounded-xl bg-muted/20 border border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{i.productName}</span>
                        <span className="text-muted-foreground text-[10px]">({i.currentStock} {i.unit} in store)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-[10px]">Usage: {i.avgDailyUsage} {i.unit}/day</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase',
                          isCritical && 'bg-red-500/10 text-red-400 border border-red-500/20',
                          isWarning && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          !isCritical && !isWarning && 'bg-green-500/10 text-green-400 border border-green-500/20'
                        )}>
                          {i.daysRemaining === 0 ? 'Empty' : `${i.daysRemaining} Days Left`}
                        </span>
                      </div>
                    </div>
                    {/* Linear progress bar */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isCritical && 'bg-red-500',
                          isWarning && 'bg-amber-500',
                          !isCritical && !isWarning && 'bg-green-500'
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Seasonal Dynamics */}
        {activeTab === 'seasonal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in">
            {/* Weekday vs Weekend split card */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-blue-400" /> Weekday vs Weekend Variance
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Average ingredient issues mapping college schedule attendance patterns.</p>
              </div>
              <div className="space-y-4 py-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-semibold text-muted-foreground">Weekday Avg. Consumption</span>
                  <span className="text-sm font-bold text-foreground">{data.seasonal.weekdayAvgQuantity} KG</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-semibold text-muted-foreground">Weekend Avg. Consumption</span>
                  <span className="text-sm font-bold text-foreground">{data.seasonal.weekendAvgQuantity} KG</span>
                </div>
                <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-400 leading-relaxed">
                  <p className="font-semibold mb-1">AI Analytical Observation:</p>
                  Weekend student check-outs cause a {(100 - (data.seasonal.weekendAvgQuantity / data.seasonal.weekdayAvgQuantity) * 100).toFixed(1)}% reduction in raw ingredient demand. Use this shift to reduce ordering size on Fridays.
                </div>
              </div>
            </div>

            {/* Meal distributions chart */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm">Meal Volume Allocations</h4>
                <p className="text-[11px] text-muted-foreground mb-4">Average weight allocation breakdown comparing Breakfast, Lunch, Dinner, and Snacks.</p>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="meal" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="Avg Quantity (KG/L)" fill="hsl(28,95%,55%)" radius={[4, 4, 0, 0]}>
                      {seasonalChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Wastage & Efficiency */}
        {activeTab === 'waste' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in">
            {/* Pie chart of reasons */}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm">Wastage Source Allocations</h4>
                <p className="text-[11px] text-muted-foreground mb-4">Total value lost segmented by report reasons</p>
              </div>
              <div className="w-full h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wastePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {wastePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatCurrency(val)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend list */}
              <div className="flex justify-center gap-4 text-[10px] text-muted-foreground pb-2">
                {data.waste.reasons.map((r, idx) => (
                  <div key={r.reason} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-bold text-foreground">{r.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Waste log lists & efficiency */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-foreground text-sm">Wastage Details & Prep Efficiency</h4>
                <p className="text-[11px] text-muted-foreground mb-4">Detailed records of reported waste and calculated kitchen preparation effectiveness.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Waste cards */}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Wastage Quantities</h5>
                  {data.waste.reasons.map(r => (
                    <div key={r.reason} className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{r.reason}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.count} incidents reported</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">{r.quantity} KG</span>
                        <p className="text-[10px] text-rose-400 font-semibold mt-0.5">{formatCurrency(r.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* prep efficiency gauge visualization */}
                <div className="p-5 rounded-xl bg-muted/30 border border-border flex flex-col justify-center items-center text-center gap-3">
                  <Gauge className="w-10 h-10 text-green-400 animate-bounce" />
                  <div>
                    <span className="text-2xl font-black text-foreground">{data.waste.prepEfficiencyIndex}%</span>
                    <h5 className="text-xs font-semibold text-foreground mt-1">Kitchen Prep Efficiency</h5>
                    <p className="text-[10px] text-muted-foreground mt-2 max-w-xs leading-relaxed">
                      Matches raw ingredient volumes issued to the biometric headcount of students served. A score above 90% indicates minimal over-preparation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
