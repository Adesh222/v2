import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Users, Stethoscope, Building2, Calendar, CheckCircle2, Clock, 
  Plus, RefreshCw, Activity, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | doctors | departments

  // Modal states
  const [showDocModal, setShowDocModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '', description: '' });
  const [newDoc, setNewDoc] = useState({
    name: '',
    email: '',
    department_id: '',
    room_number: '101',
    avg_consultation_mins: 15,
    specialization: '',
    password: 'Password123!'
  });
  const [actionMsg, setActionMsg] = useState('');

  const loadData = async () => {
    try {
      const [statsData, deptData, docData] = await Promise.all([
        api.getAdminStats(),
        api.getDepartments(),
        api.getAdminDoctors()
      ]);
      setStats(statsData);
      setDepartments(deptData);
      setDoctors(docData);
      if (deptData.length > 0 && !newDoc.department_id) {
        setNewDoc(prev => ({ ...prev, department_id: deptData[0].id }));
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await api.createDepartment(newDept);
      setShowDeptModal(false);
      setNewDept({ name: '', code: '', description: '' });
      setActionMsg('Department created successfully!');
      loadData();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to create department');
    }
  };

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    try {
      await api.createDoctor(newDoc);
      setShowDocModal(false);
      setNewDoc({
        name: '',
        email: '',
        department_id: departments[0]?.id || '',
        room_number: '101',
        avg_consultation_mins: 15,
        specialization: '',
        password: 'Password123!'
      });
      setActionMsg('Doctor and login account created successfully!');
      loadData();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to create doctor');
    }
  };

  const handleSeedDemo = async () => {
    try {
      setRefreshing(true);
      await api.seedDemo();
      await loadData();
      setActionMsg('Database successfully re-seeded with demo data!');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Seed failed');
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Hospital Administration Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hospital Admin Dashboard
            </h1>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
              SUPERADMIN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            System overview, queue throughput, doctor roster, and department control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            disabled={refreshing}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
            title="Reload realistic demo records"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Reset / Seed Demo
          </button>
          <button
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors border border-slate-200"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 my-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Doctors</span>
            <Stethoscope size={16} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.total_doctors ?? 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Active On Duty</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Patients</span>
            <Users size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.total_patients ?? 0}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Registered</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Depts</span>
            <Building2 size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.total_departments ?? 0}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Specializations</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Visits</span>
            <Calendar size={16} className="text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.today_appointments ?? 0}</div>
          <div className="text-[11px] text-sky-600 font-semibold mt-0.5">Total Scheduled</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="text-amber-800 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">In Clinic</span>
            <Activity size={16} className="text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-900">{stats?.today_in_consultation ?? 0}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Now Serving</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="text-emerald-800 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900">{stats?.today_completed ?? 0}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Finished Today</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Analytics & Activity
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'doctors'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'departments'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Departments ({departments.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Department Patient Volume (Today)</span>
              <span className="text-xs font-normal text-slate-400">Live Breakdown</span>
            </h2>
            <div className="h-64 sm:h-72 w-full">
              {stats?.department_breakdown && stats.department_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.department_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      cursor={{ fill: 'rgba(2, 132, 199, 0.05)' }}
                    />
                    <Bar dataKey="count" name="Appointments" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No appointments registered yet today.
                </div>
              )}
            </div>
          </div>

          {/* Recent Queue Activity */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Live Queue Feed</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </h2>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-slate-800">{item.ticket}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'in_consultation' ? 'bg-amber-100 text-amber-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700">{item.patient}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {item.doctor} • {item.department}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No recent queue events.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCTORS MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Hospital Medical Staff</h2>
            <button
              onClick={() => setShowDocModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={16} /> Add Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{doc.name}</h3>
                    <p className="text-xs text-sky-700 font-medium mt-0.5">{doc.department_name}</p>
                    <p className="text-[11px] text-slate-400">{doc.specialization}</p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                    {doc.room_number}
                  </span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p><span className="font-semibold">Email:</span> {doc.email}</p>
                  <p><span className="font-semibold">Avg Consultation:</span> {doc.avg_consultation_mins} mins</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.available_days?.map((d) => (
                      <span key={d} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded">
                        {d.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS MANAGEMENT */}
      {activeTab === 'departments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Hospital Departments</h2>
            <button
              onClick={() => setShowDeptModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={16} /> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {dept.code}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{dept.description || 'Clinical specialty'}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCTOR */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Doctor & Create Account</h3>
            <form onSubmit={handleCreateDoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Samantha Clark"
                  value={newDoc.name}
                  onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Login Email</label>
                <input
                  type="email"
                  required
                  placeholder="samantha@hospital.org"
                  value={newDoc.email}
                  onChange={(e) => setNewDoc({ ...newDoc, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={newDoc.department_id}
                  onChange={(e) => setNewDoc({ ...newDoc, department_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room / Clinic</label>
                  <input
                    type="text"
                    required
                    value={newDoc.room_number}
                    onChange={(e) => setNewDoc({ ...newDoc, room_number: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Avg Mins / Patient</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    required
                    value={newDoc.avg_consultation_mins}
                    onChange={(e) => setNewDoc({ ...newDoc, avg_consultation_mins: parseInt(e.target.value) || 15 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl"
                >
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Medical Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ophthalmology"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Code (Ticket Prefix)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. OPHTH"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  placeholder="Description of care provided..."
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
