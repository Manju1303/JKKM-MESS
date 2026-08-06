'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { menuAPI } from '@/lib/api';
import { Loader2, Plus, Trash2, Calendar, Coffee, UtensilsCrossed, Moon, Cake, AlertCircle, Edit2 } from 'lucide-react';

interface MenuItem {
  id: number;
  date: string;
  meal: string;
  items: string; // JSON or raw string list
  notes?: string;
}

const mealIcons: Record<string, any> = {
  BREAKFAST: Coffee,
  LUNCH: UtensilsCrossed,
  DINNER: Moon,
  SNACK: Cake,
};

export default function MenuPage() {
  const { user } = useAuthStore();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    meal: 'BREAKFAST',
    items: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isManager = user && ['SUPER_ADMIN', 'MESS_MANAGER'].includes(user.role);

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await menuAPI.getAll();
      setMenus(res.data);
    } catch {
      setError('Failed to fetch menu planner. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.items) return;
    try {
      setSubmitting(true);
      const itemsArray = form.items.split(',').map(item => item.trim()).filter(Boolean);
      const payload = {
        ...form,
        items: JSON.stringify(itemsArray)
      };

      if (editingId) {
        await menuAPI.update(editingId, payload);
      } else {
        await menuAPI.create(payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({
        date: new Date().toISOString().split('T')[0],
        meal: 'BREAKFAST',
        items: '',
        notes: '',
      });
      fetchMenus();
    } catch {
      setError('Failed to save menu plan. Please verify authentication and JSON format.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (menu: MenuItem) => {
    setEditingId(menu.id);
    let itemsStr = menu.items;
    try {
      const parsed = JSON.parse(menu.items);
      if (Array.isArray(parsed)) {
        itemsStr = parsed.join(', ');
      }
    } catch {
      // Keep raw string format
    }
    setForm({
      date: menu.date.split('T')[0],
      meal: menu.meal,
      items: itemsStr,
      notes: menu.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu plan?')) return;
    try {
      await menuAPI.delete(id);
      fetchMenus();
    } catch {
      setError('Failed to delete menu plan.');
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Weekly Meal Schedules</h2>
          <p className="text-xs text-muted-foreground">Manage and view institution mess menus</p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add Menu Plan
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {showForm && isManager && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg max-w-lg">
          <h3 className="font-semibold text-foreground mb-4">
            {editingId ? 'Edit Menu Plan' : 'Create Menu Plan'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Meal</label>
                <select
                  value={form.meal}
                  onChange={(e) => setForm({ ...form, meal: e.target.value })}
                  className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none"
                >
                  <option value="BREAKFAST">BREAKFAST</option>
                  <option value="LUNCH">LUNCH</option>
                  <option value="SNACK">SNACKS & TEA</option>
                  <option value="DINNER">DINNER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Menu Items (e.g. Idly, Chutney, Sambar)</label>
              <textarea
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
                className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none h-20"
                placeholder="List items separated by commas"
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Special Notes (Optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none"
                placeholder="e.g. Special sweet for festival day"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : menus.length === 0 ? (
        <div className="min-h-[40vh] border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
          <Calendar className="w-12 h-12 mb-3 text-muted-foreground/50" />
          <p className="text-sm font-semibold">No Menu Plans Scheduled</p>
          <p className="text-xs mt-1">Institutional meal schedule has not been prepared yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => {
            const Icon = mealIcons[menu.meal] || UtensilsCrossed;
            return (
              <div key={menu.id} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary tracking-wide">{menu.meal}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(menu.date).toLocaleDateString('en-IN', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Menu Items</p>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        let itemsList: string[] = [];
                        try {
                          const parsed = JSON.parse(menu.items);
                          if (Array.isArray(parsed)) {
                            itemsList = parsed;
                          } else {
                            itemsList = menu.items.split(',');
                          }
                        } catch {
                          itemsList = menu.items.split(',');
                        }
                        return itemsList.map((item, idx) => (
                          <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground/80">
                            {item.trim()}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>

                  {menu.notes && (
                    <div className="bg-accent/10 border border-accent/25 rounded-lg p-2 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Note: </span>
                      {menu.notes}
                    </div>
                  )}
                </div>

                {isManager && (
                  <div className="flex justify-end gap-1.5 mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => handleEdit(menu)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(menu.id)}
                      className="p-1 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
