import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { 
  Calendar, Clock, HeartPulse, User, Stethoscope, CheckCircle2, 
  AlertCircle, ChevronRight, Plus, RefreshCw, XCircle 
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // queue | book | history

  // Booking Form State
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  const loadData = async () => {
    try {
      const [myApts, depts] = await Promise.all([
        api.getMyAppointments(),
        api.getDepartments()
      ]);
      setAppointments(myApts);
      setDepartments(depts);
      if (depts.length > 0 && !selectedDept) {
        setSelectedDept(depts[0].id);
      }
    } catch (err) {
      console.error("Failed to load patient dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // 5s polling for patient queue updates
    return () => clearInterval(interval);
  }, []);

  // When selectedDept changes, load doctors for that department
  useEffect(() => {
    async function fetchDoctors() {
      if (selectedDept) {
        try {
          const docs = await api.getPublicDoctors(selectedDept);
          setDoctors(docs);
          if (docs.length > 0) {
            setSelectedDoctor(docs[0].id);
          } else {
            setSelectedDoctor('');
          }
        } catch (err) {
          console.error("Failed to load doctors:", err);
        }
      }
    }
    fetchDoctors();
  }, [selectedDept]);

  const handleBook = async (e) => {
    e.preventDefault();
    setBookingError('');
    if (!selectedDoctor) {
      setBookingError('Please select a doctor.');
      return;
    }

    setBookingLoading(true);
    try {
      const created = await api.bookAppointment({
        doctor_id: selectedDoctor,
        date: bookingDate,
        time_slot: 'Morning Queue',
        symptoms: symptoms
      });
      setBookingSuccess(created);
      setSymptoms('');
      setActiveTab('queue');
      loadData();
    } catch (err) {
      setBookingError(err.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async (aptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment ticket?")) return;
    try {
      await api.cancelAppointment(aptId);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment');
    }
  };

  const activeAppointment = appointments.find(
    (a) => a.status === 'waiting' || a.status === 'in_consultation'
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Patient Portal & Smart Queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hello, {user?.full_name || 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your live position in line or schedule a new hospital consultation
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 text-slate-500 hover:text-sky-600 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
          title="Refresh Queue"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {bookingSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Appointment Booked Successfully!</p>
              <p className="mt-0.5">Your ticket is <span className="font-mono font-bold">{bookingSuccess.ticket_number}</span> for {bookingSuccess.doctor_name}.</p>
            </div>
          </div>
          <button onClick={() => setBookingSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} />
          Live Queue Ticket
        </button>
        <button
          onClick={() => setActiveTab('book')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'book'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus size={16} />
          Book Consultation
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={16} />
          Past History ({appointments.length})
        </button>
      </div>

      {/* TAB 1: LIVE QUEUE TICKET */}
      {activeTab === 'queue' && (
        <div>
          {activeAppointment ? (
            <div className="space-y-6">
              {/* Main Ticket Display */}
              <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-600/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <HeartPulse size={200} />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Hospital Ticket #{activeAppointment.ticket_number}
                    </span>
                    <span className="text-xs text-sky-200">
                      {activeAppointment.date}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6 text-center md:text-left">
                    <div>
                      <span className="text-xs uppercase font-extrabold text-sky-200 tracking-wider">
                        Your Number
                      </span>
                      <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-1">
                        {activeAppointment.ticket_number}
                      </div>
                      <div className="text-xs text-sky-100 mt-1">
                        {activeAppointment.department_name}
                      </div>
                    </div>

                    <div className="md:border-l md:border-white/20 md:pl-6">
                      <span className="text-xs uppercase font-extrabold text-sky-200 tracking-wider">
                        Queue Position
                      </span>
                      <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight mt-1">
                        {activeAppointment.status === 'in_consultation' ? 'NOW' : `#${activeAppointment.queue_position}`}
                      </div>
                      <div className="text-xs text-sky-100 mt-1">
                        {activeAppointment.status === 'in_consultation'
                          ? 'Inside Doctor Office'
                          : `${activeAppointment.queue_position - 1} patients ahead`}
                      </div>
                    </div>

                    <div className="md:border-l md:border-white/20 md:pl-6">
                      <span className="text-xs uppercase font-extrabold text-sky-200 tracking-wider">
                        Estimated Wait
                      </span>
                      <div className="text-4xl sm:text-5xl font-black tracking-tight mt-1">
                        {activeAppointment.status === 'in_consultation'
                          ? '0m'
                          : `~${activeAppointment.estimated_wait_mins}m`}
                      </div>
                      <div className="text-xs text-sky-100 mt-1">
                        Room {activeAppointment.room_number || '101'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-sky-200">Consulting Physician: </span>
                      <span className="font-bold text-white">{activeAppointment.doctor_name}</span>
                    </div>

                    {activeAppointment.status === 'waiting' && (
                      <button
                        onClick={() => handleCancel(activeAppointment.id)}
                        className="text-rose-200 hover:text-white underline font-semibold self-start sm:self-auto"
                      >
                        Cancel Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status explanation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
                <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900 text-sm mb-0.5">Live Queue Updates Automatically</p>
                  <p>
                    Please wait in the clinic waiting area. As doctors complete or call patients, this ticket will automatically update your position in line and estimated arrival time.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center mb-4">
                <HeartPulse size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No Active Queue Ticket</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                You don't have any waiting appointments today. Book an appointment with a doctor to get your live queue number.
              </p>
              <button
                onClick={() => setActiveTab('book')}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 transition-all inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Book an Appointment Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOK CONSULTATION */}
      {activeTab === 'book' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Book Doctor Appointment</h2>
          <p className="text-xs text-slate-500 mb-6">Choose department and doctor to generate your queue ticket</p>

          {bookingError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Doctor
              </label>
              {doctors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedDoctor === doc.id
                          ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{doc.name}</span>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {doc.room_number}
                        </span>
                      </div>
                      <p className="text-xs text-sky-700 mt-0.5">{doc.specialization || doc.department_name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Avg Consultation: ~{doc.avg_consultation_mins} mins
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  No active doctors found in this department.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Appointment Date
              </label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Symptoms / Reason for Visit
              </label>
              <textarea
                rows={3}
                placeholder="Describe briefly (e.g. Chest pain, recurring cough, fever...)"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={bookingLoading || !selectedDoctor}
              className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {bookingLoading ? 'Generating Ticket...' : 'Confirm Booking & Get Queue Ticket'}
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: APPOINTMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {appointments.length > 0 ? (
            appointments.map((a) => (
              <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-base">{a.ticket_number}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      a.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      a.status === 'in_consultation' ? 'bg-amber-100 text-amber-800' :
                      a.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                      'bg-sky-100 text-sky-800'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{a.doctor_name} • {a.department_name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Date: {a.date} | Room {a.room_number}</p>
                </div>

                <div className="text-right">
                  {a.status === 'waiting' && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No past appointments recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
