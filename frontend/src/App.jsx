import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import LiveQueueDisplay from './pages/LiveQueueDisplay';
import { Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

function MainLayout() {
  const { user, role, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard | tv | login | register
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthChecking, setHealthChecking] = useState(true);

  const checkDb = async () => {
    try {
      const h = await api.getHealth();
      setHealthStatus(h);
    } catch (err) {
      setHealthStatus({ mongodb_connected: false, connection_error: "Backend API is offline or unreachable." });
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    checkDb();
    const interval = setInterval(checkDb, 10000);
    return () => clearInterval(interval);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  // Full-screen Lobby Display TV View
  if (currentView === 'tv') {
    return <LiveQueueDisplay onExit={() => setCurrentView('dashboard')} />;
  }

  const renderContent = () => {
    if (!user) {
      if (currentView === 'register') {
        return <Register onNavigate={setCurrentView} />;
      }
      return <Login onNavigate={setCurrentView} />;
    }

    // Role-specific Dashboards
    switch (role) {
      case 'admin':
        return <AdminDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'patient':
      default:
        return <PatientDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Database Connection Warning Banner if Atlas password not set */}
      {healthStatus && !healthStatus.mongodb_connected && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertTriangle size={18} className="shrink-0" />
            <span>
              <strong>MongoDB Status:</strong> {healthStatus.connection_error || 'Database password placeholder detected.'}
            </span>
          </div>
          <button
            onClick={checkDb}
            className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded-lg ml-2 hover:bg-slate-800"
          >
            Retry Connection
          </button>
        </div>
      )}

      <main className="flex-1 pb-16">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MediQueue Systems. Smart Hospital Queue & Appointment Management.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${healthStatus?.mongodb_connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              {healthStatus?.mongodb_connected ? 'MongoDB Atlas Connected' : 'DB Configuration Needed'}
            </span>
            <span>FastAPI Backend (Port 8000)</span>
            <span>React + Vite (Port 5173)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
