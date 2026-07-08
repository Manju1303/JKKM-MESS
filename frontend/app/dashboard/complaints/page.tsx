'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { complaintsAPI } from '@/lib/api';
import { Loader2, Plus, MessageSquare, CheckCircle, AlertCircle, AlertTriangle, User } from 'lucide-react';

interface ComplaintItem {
  id: number;
  studentId: number;
  studentName: string;
  title: string;
  description: string;
  status: string; // PENDING, RESOLVED
  resolvedBy?: number;
  resolvedAt?: string;
  createdAt: string;
}

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state (Student only)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const isStudent = user && user.role === 'STUDENT_VIEWER';
  const isWardenOrAdmin = user && ['SUPER_ADMIN', 'HOSTEL_WARDEN'].includes(user.role);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await complaintsAPI.getAll();
      setComplaints(res.data);
    } catch (err) {
      setError('Failed to load complaints registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) return;
    try {
      setSubmitting(true);
      await complaintsAPI.create(form);
      setShowForm(false);
      setForm({ title: '', description: '' });
      fetchComplaints();
    } catch (err) {
      setError('Failed to submit complaint. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await complaintsAPI.resolve(id);
      fetchComplaints();
    } catch (err) {
      setError('Failed to resolve complaint.');
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Complaints Management</h2>
          <p className="text-xs text-muted-foreground">
            {isStudent ? 'Submit and track hostel complaints' : 'Track and resolve student grievances'}
          </p>
        </div>
        {isStudent && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            File Complaint
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {showForm && isStudent && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg max-w-lg">
          <h3 className="font-semibold text-foreground mb-4">File a New Complaint</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Issue Subject</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none"
                placeholder="e.g. Broken water purifier in Block B"
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Detailed Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-sm rounded-lg bg-muted border border-border p-2 text-foreground focus:outline-none h-24"
                placeholder="Provide details about the issue..."
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
                Submit Complaint
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="min-h-[40vh] border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
          <MessageSquare className="w-12 h-12 mb-3 text-muted-foreground/50" />
          <p className="text-sm font-semibold">No Complaints Registered</p>
          <p className="text-xs mt-1">Excellent! There are no outstanding complaints to display.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'RESOLVED'
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Filed on {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  {isWardenOrAdmin && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>{item.studentName} (ID: {item.studentId})</span>
                    </div>
                  )}
                </div>
                <h4 className="text-base font-bold text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

                {item.status === 'RESOLVED' && (
                  <p className="text-[10px] text-green-500 font-medium">
                    ✓ Resolved on {new Date(item.resolvedAt || item.createdAt).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>

              {item.status === 'PENDING' && isWardenOrAdmin && (
                <button
                  onClick={() => handleResolve(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all self-start md:self-center shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolve Issue
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
