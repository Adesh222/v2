import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Monitor, RefreshCw, Users, Clock, Activity, CheckCircle2 } from 'lucide-react';

export default function LiveQueueDisplay({ onExit }) {
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  const loadOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
    } catch (err) {
      console.error("Failed to load queue overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    const qInterval = setInterval(loadOverview, 4000); // 4-second real-time lobby updates
    const tInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => {
      clearInterval(qInterval);
      clearInterval(tInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between">
      {/* Lobby TV Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Hospital Waiting Hall Display
              <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Please proceed to your assigned room when your number is called</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono tracking-tight text-sky-400">{currentTime}</div>
            <div className="text-xs text-slate-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            >
              Exit TV Mode
            </button>
          )}
        </div>
      </div>

      {/* Grid of Doctor Clinic Counters */}
      <div className="my-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw className="w-10 h-10 animate-spin text-sky-500 mb-3" />
            <p className="text-sm font-semibold">Synchronizing Live Hospital Queues...</p>
          </div>
        ) : overview.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overview.map((docQueue) => (
              <div
                key={docQueue.doctor_id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between"
              >
                {/* Doctor Room Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                      {docQueue.department_name}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-0.5">{docQueue.doctor_name}</h2>
                  </div>
                  <div className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-black px-3 py-1.5 rounded-xl font-mono">
                    {docQueue.room_number}
                  </div>
                </div>

                {/* Now Serving Big Callout */}
                <div className="my-6 p-6 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/80 text-center relative">
                  <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider mb-1 flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                    NOW SERVING
                  </div>

                  {docQueue.now_serving ? (
                    <div>
                      <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-2">
                        {docQueue.now_serving.ticket_number}
                      </div>
                      <div className="text-sm font-semibold text-slate-300 truncate">
                        {docQueue.now_serving.patient_name}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="text-2xl font-bold text-slate-500">Ready for Patient</div>
                      <div className="text-xs text-slate-600 mt-1">Calling next ticket shortly</div>
                    </div>
                  )}
                </div>

                {/* Next in line & queue stats footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Next in Line</span>
                    <span className="font-mono font-bold text-sky-300 text-sm">
                      {docQueue.next_in_line ? docQueue.next_in_line.ticket_number : '—'}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Waiting</span>
                    <span className="font-bold text-slate-200 text-sm">
                      {docQueue.waiting_count} in queue
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Est. Wait</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      ~{docQueue.waiting_count * docQueue.avg_wait_mins}m
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-bold text-slate-400">No active clinics found.</p>
            <p className="text-xs text-slate-600 mt-1">Please log in to Admin or Doctor portal to activate clinic sessions.</p>
          </div>
        )}
      </div>

      {/* Footer ticker */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>MediQueue Smart Hospital Management System • Real-Time Queue & Waiting Room Sync</p>
        <p className="text-sky-400 font-mono">Automated refresh active</p>
      </div>
    </div>
  );
}
