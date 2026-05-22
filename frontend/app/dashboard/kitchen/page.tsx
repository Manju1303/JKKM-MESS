'use client';
import { useEffect, useState } from 'react';
import { kitchenAPI, productsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Search, ChefHat, Calendar, Users, Percent, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    meal: 'LUNCH',
    headcount: '',
    notes: '',
    issueDate: new Date().toISOString().split('T')[0],
  });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, productsRes] = await Promise.all([
        kitchenAPI.getTodayIssues(),
        productsAPI.getAll(),
      ]);
      setIssues(issuesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        quantity: '',
        meal: 'LUNCH',
        headcount: '',
        notes: '',
        issueDate: new Date().toISOString().split('T')[0],
      });
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Product *</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>

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
