import React, { useState, useEffect } from 'react';
import { api } from '../api';
import QueueCard from '../components/QueueCard';
import { 
  Stethoscope, Users, CheckCircle2, Clock, PlayCircle, 
  RefreshCw, AlertCircle, Phone, Sparkles 
} from 'lucide-react';

export default function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadQueue = async () => {
    try {
      const [prof, q] = await Promise.all([
        api.getMyDoctorProfile(),
        api.getMyDoctorQueue()
      ]);
      setProfile(prof);
      setQueueData(q);
      setErrorMsg('');
    } catch (err) {
      console.error("Queue fetch error:", err);
      setErrorMsg(err.message || 'Unable to load doctor queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000); // 5s polling for real-time queue synchronization
    return () => clearInterval(interval);
  }, []);

  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      await api.callNextPatient();
      await loadQueue();
    } catch (err) {
      alert(err.message || 'Failed to call next patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (aptId, action) => {
    setActionLoading(true);
    try {
      await api.updateAppointmentAction(aptId, action);
      await loadQueue();
    } catch (err) {
      alert(err.message || 'Failed to update patient status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Doctor Consultation Queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Stethoscope size={240} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                ACTIVE CLINIC
              </span>
              <span className="text-xs text-slate-300 font-mono">Room: {profile?.room_number}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.name}</h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              {profile?.department_name} • {profile?.specialization || 'Consultant Specialist'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCallNext}
              disabled={actionLoading || queueData?.waiting_count === 0}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayCircle size={18} />
              Call Next Patient
            </button>
            <button
              onClick={loadQueue}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors text-white"
              title="Refresh queue"
            >
              <RefreshCw size={18} className={actionLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Queue Counter Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Now Inside</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {queueData?.now_serving ? queueData.now_serving.ticket_number : 'None'}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
              {queueData?.now_serving?.patient_name || 'No patient currently inside'}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Waiting in Queue</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {queueData?.waiting_count ?? 0} patients
            </div>
            <div className="text-[11px] text-sky-600 font-medium">
              ~{(queueData?.waiting_count ?? 0) * (queueData?.avg_wait_mins ?? 15)} mins remaining
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Completed Today</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {queueData?.completed_count ?? 0} patients
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Consultations finished</div>
          </div>
        </div>
      </div>

      {/* Main Queue Management Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CURRENTLY SERVING HERO CARD */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
            Currently In Consultation
          </h2>
          {queueData?.now_serving ? (
            <QueueCard
              appointment={queueData.now_serving}
              isDoctorView={true}
              onAction={handleAction}
            />
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Patient in Room</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Call Next Patient" to call ticket #{queueData?.next_in_line?.ticket_number || 'Next'}
              </p>
            </div>
          )}
        </div>

        {/* UPCOMING PATIENTS LIST */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Waiting Queue ({queueData?.queue_list?.length ?? 0})
            </h2>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live auto-refresh
            </span>
          </div>

          <div className="space-y-3">
            {queueData?.queue_list && queueData.queue_list.length > 0 ? (
              queueData.queue_list.map((apt) => (
                <QueueCard
                  key={apt.id}
                  appointment={apt}
                  isDoctorView={true}
                  onAction={handleAction}
                />
              ))
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Queue is Clear!</p>
                <p className="text-xs text-slate-400 mt-1">There are no waiting patients at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
