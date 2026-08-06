'use client';
import { useEffect, useState } from 'react';
import { kitchenAPI, productsAPI, inventoryAPI, aiAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Search, ChefHat, Calendar, Users, Clock, AlertCircle, TrendingUp, DollarSign, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface KitchenIssue {
  id: number;
  issueDate: string;
  productName: string;
  quantity: number;
  unit: string;
  meal: string;
  issuedByName: string;
  headcount: number;
  perHeadUsage?: number;
  notes?: string;
}

interface Product {
  id: number;
  name: string;
  unit: string;
}

export default function KitchenPage() {
  const [issues, setIssues] = useState<KitchenIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [costTrends, setCostTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    batchNumber: '',
    quantity: '',
    meal: 'LUNCH',
    headcount: '',
    notes: '',
    issueDate: new Date().toISOString().split('T')[0],
  });
  const [fefoWarning, setFefoWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI assistant state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [targetHeadcount, setTargetHeadcount] = useState('');

  const fetchSuggestions = async (count: number) => {
    if (!count) {
      setAiSuggestions([]);
      return;
    }
    try {
      setAiLoading(true);
      const res = await aiAPI.getAttendanceForecast(count);
      setAiSuggestions(res.data || []);
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, productsRes, inventoryRes, trendsRes] = await Promise.all([
        kitchenAPI.getTodayIssues(),
        productsAPI.getAll(),
        inventoryAPI.getAll(),
        kitchenAPI.getCostPerMeal(15),
      ]);
      setIssues(issuesRes.data || []);
      setProducts(productsRes.data || []);
      setInventoryItems(inventoryRes.data || []);
      if (trendsRes.data) {
        setCostTrends(trendsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const checkFEFOCompliance = async (pId: string, bNum: string) => {
    if (!pId || !bNum) {
      setFefoWarning(null);
      return;
    }
    try {
      const res = await kitchenAPI.checkFefo(Number(pId), bNum);
      if (res.data && res.data.isOldest === false) {
        setFefoWarning(res.data.warning || `FEFO Alert: Batch #${bNum} is not the oldest expiring batch!`);
      } else {
        setFefoWarning(null);
      }
    } catch {
      setFefoWarning(null);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.productId || !form.quantity || !form.headcount) {
      setSubmitError('Please fill all required fields.');
      return;
    }
    const selectedProd = products.find(p => p.id === Number(form.productId));
    setSubmitting(true);
    try {
      await kitchenAPI.issueStock({
        productId: Number(form.productId),
        batchNumber: form.batchNumber || undefined,
        quantity: Number(form.quantity),
        unit: selectedProd?.unit || 'KG',
        meal: form.meal,
        headcount: Number(form.headcount),
        notes: form.notes,
        issueDate: new Date(form.issueDate).toISOString(),
      });
      setShowForm(false);
      setForm({
        productId: '',
        batchNumber: '',
        quantity: '',
        meal: 'LUNCH',
        headcount: '',
        notes: '',
        issueDate: new Date().toISOString().split('T')[0],
      });
      setFefoWarning(null);
      fetchData();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Error issuing stock. Please check inventory levels.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchSearch = issue.productName.toLowerCase().includes(search.toLowerCase());
    const matchMeal = mealFilter === 'all' || issue.meal === mealFilter;
    return matchSearch && matchMeal;
  });

  const totalMealCount = issues.reduce((sum, i) => sum + (i.headcount || 0), 0);
  const totalItemsIssued = issues.length;

  return (
    <div className="space-y-6 animate-in">
      {/* Top metrics */}
      <section aria-label="Kitchen Usage Summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kitchen Issues Today</p>
            <h3 className="text-xl font-bold text-foreground">{totalItemsIssued}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/10 text-green-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Headcount Served</p>
            <h3 className="text-xl font-bold text-foreground">{totalMealCount}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Meal Sessions</p>
            <h3 className="text-xl font-bold text-foreground">
              {Array.from(new Set(issues.map(i => i.meal))).length || 0}
            </h3>
          </div>
        </div>
      </section>

      {/* Cost-per-Meal Analytics Trend Chart */}
      {costTrends.length > 0 && (
        <section aria-label="Cost per Meal Trend Analytics" className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Cost per Meal Analytics (FEFO pricing)
              </h3>
              <p className="text-[11px] text-muted-foreground">Historical trend analysis of recipe costs per student (INR)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground mr-1">
              <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-primary" /> Average Per Student</span>
            </div>
          </div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                <Line type="monotone" dataKey="Breakfast" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Lunch" stroke="#f97316" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Dinner" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Main Actions Panel */}
      <section aria-label="Consumption Filters" className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex flex-1 gap-2 flex-wrap w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none"
          >
            <option value="all">All Meals</option>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="DINNER">Dinner</option>
            <option value="SNACK">Snack</option>
          </select>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Issue Stock to Kitchen
        </button>
      </section>

      {/* Grid: Form and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Container */}
        {showForm && (
          <section aria-label="Stock Issue Form" className="lg:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-foreground text-md flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Stock Issue Form
            </h3>
            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* AI Prediction Assistant */}
              <div className="p-3 bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5" />
                    AI Prediction Assistant
                  </label>
                  {aiLoading && <Clock className="w-3 h-3 animate-spin text-primary" />}
                </div>
                <div className="space-y-1">
                  <input
                    type="number"
                    placeholder="Enter expected headcount..."
                    value={targetHeadcount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetHeadcount(val);
                      if (val) {
                        fetchSuggestions(Number(val));
                      } else {
                        setAiSuggestions([]);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                    Analyzes waste history & occupancy trends to minimize ingredient loss.
                  </p>
                </div>
                {aiSuggestions.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin mt-1 border-t border-border/40 pt-1.5">
                    {aiSuggestions.map((s) => (
                      <button
                        key={s.productId}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            productId: String(s.productId),
                            quantity: String(s.predictedMealNeed),
                            headcount: targetHeadcount,
                            notes: `AI-forecasted for ${targetHeadcount} students (Factor: ${s.adjustmentFactorApplied ?? 1}x)`,
                          }));
                          // Auto select first available batch if possible
                          const batches = inventoryItems.filter(item => item.productId === s.productId && item.quantity > 0 && !item.isExpired);
                          if (batches.length > 0) {
                            setForm((prev) => ({
                              ...prev,
                              productId: String(s.productId),
                              quantity: String(s.predictedMealNeed),
                              headcount: targetHeadcount,
                              batchNumber: batches[0].batchNumber || '',
                              notes: `AI-forecasted for ${targetHeadcount} students (Factor: ${s.adjustmentFactorApplied ?? 1}x)`,
                            }));
                            checkFEFOCompliance(String(s.productId), batches[0].batchNumber || '');
                          }
                        }}
                        className="w-full text-[10px] text-left p-1.5 rounded-lg bg-muted/50 hover:bg-primary/10 border border-border/80 flex items-center justify-between transition-all"
                      >
                        <span className="font-semibold text-foreground truncate max-w-[125px]">{s.productName}</span>
                        <span className="text-primary font-bold">{s.predictedMealNeed} {s.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => {
                    const nextPId = e.target.value;
                    setForm({ ...form, productId: nextPId, batchNumber: '' });
                    setFefoWarning(null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>

              {form.productId && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Batch (FEFO Verification) *</label>
                  {inventoryItems.filter(item => item.productId === Number(form.productId) && item.quantity > 0 && !item.isExpired).length === 0 ? (
                    <div className="text-xs text-amber-500 py-1 font-semibold">⚠️ No active stock batches found in store.</div>
                  ) : (
                    <select
                      value={form.batchNumber}
                      onChange={(e) => {
                        const bVal = e.target.value;
                        setForm({ ...form, batchNumber: bVal });
                        checkFEFOCompliance(form.productId, bVal);
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      required
                    >
                      <option value="">Choose a batch...</option>
                      {inventoryItems
                        .filter(item => item.productId === Number(form.productId) && item.quantity > 0 && !item.isExpired)
                        .map(b => (
                          <option key={b.id} value={b.batchNumber || ''}>
                            Batch {b.batchNumber || 'N/A'} - Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'None'} ({b.quantity} {b.unit} left)
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {fefoWarning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-orange-400 text-xs rounded-lg flex items-start gap-2 animate-pulse font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fefoWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Meal *</label>
                  <select
                    value={form.meal}
                    onChange={(e) => setForm({ ...form, meal: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="SNACK">Snack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Headcount *</label>
                  <input
                    type="number"
                    placeholder="Students served"
                    value={form.headcount}
                    onChange={(e) => setForm({ ...form, headcount: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes / Remarks</label>
                <textarea
                  placeholder="E.g. Special menu, extra cooking"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-foreground bg-muted border border-border hover:bg-muted/80 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center gap-1.5"
                >
                  {submitting && <Clock className="w-3 h-3 animate-spin" />}
                  {submitting ? 'Processing...' : 'Confirm Issue'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Table Container */}
        <section aria-label="Daily Issue History" className={cn(
          "bg-card border border-border rounded-xl p-5 overflow-hidden",
          showForm ? "lg:col-span-2" : "lg:col-span-3"
        )}>
          <h3 className="font-bold text-foreground text-md mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Today's Consumption Logs
          </h3>

          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <Clock className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No kitchen issues logged today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                    <th className="pb-3">Date/Time</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3">Meal</th>
                    <th className="pb-3 text-right">Headcount</th>
                    <th className="pb-3 text-right">Per-Head</th>
                    <th className="pb-3">Issued By</th>
                    <th className="pb-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredIssues.map((issue) => (
                    <tr key={issue.id} className="text-sm hover:bg-muted/50 transition-colors">
                      <td className="py-3 text-xs text-muted-foreground">{formatDate(issue.issueDate)}</td>
                      <td className="py-3 font-medium text-foreground">{issue.productName}</td>
                      <td className="py-3 text-right font-medium text-foreground">{issue.quantity} {issue.unit}</td>
                      <td className="py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium border",
                          issue.meal === 'BREAKFAST' && 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                          issue.meal === 'LUNCH' && 'bg-green-500/15 text-green-400 border-green-500/30',
                          issue.meal === 'DINNER' && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                          issue.meal === 'SNACK' && 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        )}>
                          {issue.meal}
                        </span>
                      </td>
                      <td className="py-3 text-right">{issue.headcount}</td>
                      <td className="py-3 text-right text-xs font-mono text-muted-foreground">
                        {issue.perHeadUsage ? `${issue.perHeadUsage.toFixed(3)} ${issue.unit}` : '-'}
                      </td>
                      <td className="py-3 text-xs">{issue.issuedByName}</td>
                      <td className="py-3 text-xs text-muted-foreground max-w-[150px] truncate" title={issue.notes}>
                        {issue.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
