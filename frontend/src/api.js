const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('mediqueue_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && token) {
        localStorage.removeItem('mediqueue_token');
        localStorage.removeItem('mediqueue_user');
        window.location.reload();
      }
      throw new Error(data?.detail || 'An error occurred while processing request');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => apiRequest('/api/health'),

  // Auth
  login: (creds) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
  register: (userData) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/api/auth/me'),
  seedDemo: () => apiRequest('/api/auth/seed', { method: 'POST' }),

  // Admin
  getAdminStats: () => apiRequest('/api/admin/stats'),
  getDepartments: () => apiRequest('/api/admin/departments'),
  createDepartment: (dept) => apiRequest('/api/admin/departments', { method: 'POST', body: JSON.stringify(dept) }),
  getAdminDoctors: () => apiRequest('/api/admin/doctors'),
  createDoctor: (doc) => apiRequest('/api/admin/doctors', { method: 'POST', body: JSON.stringify(doc) }),

  // Doctors
  getPublicDoctors: (deptId) => apiRequest(`/api/doctors${deptId ? `?department_id=${deptId}` : ''}`),
  getMyDoctorProfile: () => apiRequest('/api/doctors/me'),
  getMyDoctorQueue: () => apiRequest('/api/doctors/queue/today'),
  callNextPatient: () => apiRequest('/api/doctors/call-next', { method: 'POST' }),
  updateAppointmentAction: (id, action) => apiRequest(`/api/doctors/action/${id}/${action}`, { method: 'POST' }),

  // Appointments
  bookAppointment: (payload) => apiRequest('/api/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  getMyAppointments: () => apiRequest('/api/appointments/my'),
  cancelAppointment: (id) => apiRequest(`/api/appointments/${id}`, { method: 'DELETE' }),

  // Queue
  getDoctorQueue: (docId) => apiRequest(`/api/queue/doctor/${docId}`),
  getOverview: () => apiRequest('/api/queue/overview'),
  trackTicket: (ticketNum) => apiRequest(`/api/queue/ticket/${ticketNum}`)
};
