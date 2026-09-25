import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Stethoscope, HeartPulse, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass = 'Password123!') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed. Make sure database is connected and seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-sky-500/30 mb-3">
              <Activity size={30} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to MediQueue</h1>
            <p className="text-xs text-slate-500 mt-1">Smart Hospital Queue & Appointment System</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mediqueue.demo"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Roles
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@mediqueue.demo')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 transition-all text-amber-900 group"
              >
                <Shield size={18} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('doctor@mediqueue.demo')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all text-emerald-900 group"
              >
                <Stethoscope size={18} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Doctor</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('patient@mediqueue.demo')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 transition-all text-sky-900 group"
              >
                <HeartPulse size={18} className="text-sky-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Patient</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Default password: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Password123!</code>
            </p>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-sky-600 font-bold hover:underline"
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
