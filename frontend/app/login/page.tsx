'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

const demoCredentials = [
  { role: 'Super Admin', email: 'admin@jkkm.edu.in', password: 'Admin@123' },
  { role: 'Mess Manager', email: 'manager@jkkm.edu.in', password: 'Manager@123' },
  { role: 'Storekeeper', email: 'store@jkkm.edu.in', password: 'Store@123' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(form);
      setAuth(res.data.user, res.data.access_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(224,40%,8%)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4 shadow-2xl">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">JKKM Mess ERP</h1>
          <p className="text-white/60 mt-1 text-sm">Enterprise Hostel Mess Management System</p>
          <p className="text-white/40 text-xs mt-1">JKKM College, Erode District, Tamil Nadu</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm animate-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-all text-sm"
                  placeholder="your@jkkm.edu.in"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-all text-sm"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 gradient-primary rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-lg"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign In to ERP'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/40 text-xs text-center mb-3">Demo Credentials</p>
            <div className="space-y-2">
              {demoCredentials.map((cred) => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => setForm({ email: cred.email, password: cred.password })}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-xs font-medium">{cred.role}</span>
                    <span className="text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to fill →
                    </span>
                  </div>
                  <span className="text-white/40 text-xs">{cred.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-4">
          © 2026 JKKM College • Erode District, Tamil Nadu
        </p>
      </div>
    </div>
  );
}
