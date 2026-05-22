'use client';
import { useEffect, useState } from 'react';
import { aiAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Brain, AlertTriangle, TrendingUp, Cpu, Sparkles, BarChart3, Info, HelpCircle, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Mock Fallback Data ────────────────────────────────────────────────────────
const mockInsights = {
  summary: {
    criticalItems: 2,
    highUrgencyItems: 3,
    spendingAnomalies: 1,
    topConsumerProduct: 'Ponni Rice',
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
    { productId: 2, productName: 'Toor Dal', unit: 'KG', avgDailyUsage: 12.3, predicted7DayNeed: 86.1, recommendedOrderQty: 103.32 },
    { productId: 3, productName: 'Atta (Flour)', unit: 'KG', avgDailyUsage: 18.2, predicted7DayNeed: 127.4, recommendedOrderQty: 152.88 },
    { productId: 4, productName: 'Potato', unit: 'KG', avgDailyUsage: 25.0, predicted7DayNeed: 175.0, recommendedOrderQty: 210.0 },
    { productId: 5, productName: 'Sunflower Oil', unit: 'LITRE', avgDailyUsage: 8.5, predicted7DayNeed: 59.5, recommendedOrderQty: 71.4 },
  ]
};

export default function AiInsightsPage() {
  const [data, setData] = useState(mockInsights);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await aiAPI.getInsights();
      if (res.data && res.data.summary) {
        setData(res.data);
      }
    } catch (e) {
      console.log('Using local mock AI forecasting outputs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    fetchInsights();
  };

  const chartData = data.predictions.map(p => ({
    name: p.productName,
    '7-Day Demand': p.predicted7DayNeed,
    'Suggested Order': p.recommendedOrderQty,
  }));

  return (
    <div className="space-y-6 animate-in">
      {/* Header controls */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white shadow-lg">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-none flex items-center gap-1.5">
              AI Analytics & Forecasting Panel
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Statistical Engine
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Mathematical projections based on past consumption & purchases</p>
          </div>
        </div>
        <button
          onClick={triggerRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          Re-Analyze
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/15 text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{data.summary.criticalItems}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Stock Out Risks</p>
            <p className="text-xs text-red-400 mt-1">Requires immediate attention</p>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{data.summary.highUrgencyItems}</p>
            <p className="text-sm text-muted-foreground mt-0.5">High Reorder Items</p>
            <p className="text-xs text-amber-400 mt-1">Approaching minimum level</p>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-500">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{data.summary.spendingAnomalies}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Spend Anomalies</p>
            <p className="text-xs text-blue-400 mt-1">Z-score deviations detected</p>
          </div>
        </div>

        <div className="stat-card bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/15 text-green-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground truncate">{data.summary.topConsumerProduct}</p>
            <p className="text-sm text-muted-foreground mt-0.5">Top Consumer Item</p>
            <p className="text-xs text-green-400 mt-1">Highest daily issuance volume</p>
          </div>
        </div>
      </div>

      {/* Grid: Charts & Reorder Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predictions Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base">7-Day Projected Need vs Recommended Orders</h3>
            <p className="text-xs text-muted-foreground mb-4">AI recommendation including a 20% safe buffer based on 30-day usage</p>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-base mb-1">Smart Reorder Suggestions</h3>
            <p className="text-xs text-muted-foreground mb-4">Stock deficits and suggested procurement sizes</p>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {data.reorderSuggestions.map(s => (
              <div key={s.productId} className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">{s.productName}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Current: <span className="font-semibold text-foreground">{s.currentStock} / {s.minRequired} {s.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase',
                    s.urgency === 'CRITICAL' && 'bg-red-500/10 text-red-500 border-red-500/20',
                    s.urgency === 'HIGH' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    s.urgency === 'MEDIUM' && 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  )}>
                    {s.urgency}
                  </span>
                  <p className="text-[10px] text-primary font-bold mt-1">PO Qty: {s.suggestedOrderQty} {s.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Purchase Anomaly Detection & AI Predicts Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Anomalies */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-base">Purchase Anomaly Detections</h3>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-popover border border-border shadow-xl text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Triggers flags when an invoice amount deviates more than 2.0 standard deviations (Z-score) from mean historical purchases.
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Flagging unusual procurement invoices for manual audit</p>

          {data.anomalies.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-lg">
              <Info className="w-8 h-8 text-muted-foreground/45 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No purchase anomalies flagged.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.anomalies.map(a => (
                <div key={a.purchaseNumber} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">High Spend Flag</span>
                    <h4 className="text-xs font-semibold text-foreground mt-0.5">{a.purchaseNumber}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Supplier: <span className="font-semibold text-foreground">{a.supplierName || 'Global Supplier'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(a.netAmount)}</p>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/15 text-red-400 border border-red-500/30 inline-block mt-1">
                      Z-score: +{a.zScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed 7-day predicted need */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground text-base mb-1">Consumption Forecasting Table</h3>
          <p className="text-xs text-muted-foreground mb-4">Calculated expected demand rates for core inventory</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 font-semibold">Product Name</th>
                  <th className="py-2 font-semibold text-right">Avg Daily Consumption</th>
                  <th className="py-2 font-semibold text-right">Proj. 7-Day Need</th>
                  <th className="py-2 font-semibold text-right text-primary">Rec. Purchase Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.predictions.map(p => (
                  <tr key={p.productId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">{p.productName}</td>
                    <td className="py-2.5 text-right font-semibold">{p.avgDailyUsage} {p.unit}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{p.predicted7DayNeed} {p.unit}</td>
                    <td className="py-2.5 text-right font-bold text-primary">{p.recommendedOrderQty} {p.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
