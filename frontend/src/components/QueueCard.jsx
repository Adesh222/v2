import React from 'react';
import { Clock, User, CheckCircle2, AlertCircle, PlayCircle, SkipForward } from 'lucide-react';

export default function QueueCard({ appointment, isDoctorView = false, onAction }) {
  if (!appointment) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_consultation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            IN CONSULTATION
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            <SkipForward size={13} /> Skipped
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock size={13} /> Waiting
          </span>
        );
    }
  };

  const isCurrent = appointment.status === 'in_consultation';

  return (
    <div
      className={`rounded-2xl p-5 border transition-all ${
        isCurrent
          ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/50 border-amber-300 shadow-md ring-2 ring-amber-400/20'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
              {appointment.ticket_number}
            </span>
            {getStatusBadge(appointment.status)}
          </div>
          <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
            <User size={15} className="text-slate-400" />
            {appointment.patient_name}
            {appointment.patient_phone && (
              <span className="text-xs text-slate-400 font-normal">({appointment.patient_phone})</span>
            )}
          </p>
          {appointment.symptoms && (
            <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
              "{appointment.symptoms}"
            </p>
          )}
        </div>

        <div className="text-right">
          {appointment.status === 'waiting' && (
            <div>
              <div className="text-xs font-medium text-slate-500">Est. Wait</div>
              <div className="text-lg font-bold text-sky-700 flex items-center justify-end gap-1">
                <Clock size={16} />
                <span>{appointment.estimated_wait_mins} mins</span>
              </div>
              <div className="text-[11px] text-slate-400">Position #{appointment.queue_position}</div>
            </div>
          )}
          {appointment.status === 'in_consultation' && (
            <div className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
              Inside Room {appointment.room_number || ''}
            </div>
          )}
        </div>
      </div>

      {/* Doctor Action Buttons */}
      {isDoctorView && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {appointment.status === 'waiting' && (
            <button
              onClick={() => onAction(appointment.id, 'in_consultation')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors"
            >
              <PlayCircle size={15} /> Call Patient
            </button>
          )}
          {appointment.status === 'in_consultation' && (
            <>
              <button
                onClick={() => onAction(appointment.id, 'skipped')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                <SkipForward size={14} /> Skip
              </button>
              <button
                onClick={() => onAction(appointment.id, 'completed')}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors"
              >
                <CheckCircle2 size={15} /> Mark Completed
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
