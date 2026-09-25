import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Monitor, User, Shield, Stethoscope, HeartPulse } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, role, logout } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-300"><Shield size={12}/> Admin</span>;
      case 'doctor':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-300"><Stethoscope size={12}/> Doctor</span>;
      case 'patient':
        return <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-sky-300"><HeartPulse size={12}/> Patient</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-700 to-indigo-800 bg-clip-text text-transparent">
                  MediQueue
                </span>
                <span className="text-[10px] tracking-wider font-extrabold uppercase bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                  SMART QUEUE
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Hospital Queue & Appointment System</p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Public TV Queue Display Link */}
            <button
              onClick={() => setCurrentView(currentView === 'tv' ? 'dashboard' : 'tv')}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg transition-all ${
                currentView === 'tv'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Hospital Lobby Live Screen"
            >
              <Monitor size={16} />
              <span className="hidden md:inline">{currentView === 'tv' ? 'Back to App' : 'Waiting Lobby TV'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user.full_name}</p>
                    <div className="mt-0.5">{getRoleBadge()}</div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-sky-600 px-3 py-1.5"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className="text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-lg shadow-sm"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
