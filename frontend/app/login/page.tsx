'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4 shadow-2xl overflow-hidden p-2">
            <img src="/logo.png" alt="JKKM Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white">JKKM Mess ERP</h1>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <h2 className="login-card-title">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm animate-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form-container">
            <div className="login-form-group">
              <label htmlFor="email" className="login-form-label">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="login-input-field"
                  placeholder="your@jkkm.edu.in"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="password" className="login-form-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="login-input-field"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit-button"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign In to ERP'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-4">
          © 2026 JKKM College • Erode District, Tamil Nadu
        </p>
      </div>
    </div>
  );
}
