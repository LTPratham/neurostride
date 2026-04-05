// NeuroStride — API Client
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_URL })

// Inject JWT on every request
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ns_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ns_token')
      localStorage.removeItem('ns_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login:    (email, password) => api.post('/api/auth/login',    { email, password }),
  register: (data)            => api.post('/api/auth/register', data),
  me:       ()                => api.get('/api/auth/me'),
}

// ── Patients ───────────────────────────────────────────────
export const patientApi = {
  list:       ()           => api.get('/api/patients'),
  get:        (id)         => api.get(`/api/patients/${id}`),
  update:     (id, data)   => api.put(`/api/patients/${id}`, data),
  assignDoc:  (id, docId)  => api.post(`/api/patients/${id}/assign-doctor?doctor_id=${docId}`),
}

// ── Sessions ───────────────────────────────────────────────
export const sessionApi = {
  start:       (data)       => api.post('/api/sessions', data),
  end:         (id, data)   => api.put(`/api/sessions/${id}/end`, data),
  forPatient:  (patientId)  => api.get(`/api/sessions/patient/${patientId}`),
}

// ── Exercise plans ─────────────────────────────────────────
export const planApi = {
  create:     (data)        => api.post('/api/exercise-plans', data),
  forPatient: (patientId)   => api.get(`/api/exercise-plans/patient/${patientId}`),
}

// ── Prescriptions ──────────────────────────────────────────
export const prescriptionApi = {
  create:     (data)        => api.post('/api/prescriptions', data),
  forPatient: (patientId)   => api.get(`/api/prescriptions/patient/${patientId}`),
}

// ── Medicine autocomplete ──────────────────────────────────
export const medicineSearch = (q) => api.get('/api/pharmacy/search', { params: { q } })
export const updateStock = (id, data) => api.put(`/api/pharmacy/inventory/${id}/stock`, data)

// ── Pharmacy ───────────────────────────────────────────────
export const pharmacyApi = {
  orders:      (status)     => api.get('/api/pharmacy/orders', { params: { status } }),
  updateOrder: (id, data)   => api.put(`/api/pharmacy/orders/${id}`, data),
  inventory:   ()           => api.get('/api/pharmacy/inventory'),
  lowStock:    ()           => api.get('/api/pharmacy/inventory/low-stock'),
}

// ── PharmaMind (pharmacy2) ────────────────────────────────
export const pm2Api = {
  medicines:   (q)       => api.get('/api/pharmacy2/medicines', { params: { q } }),
  orders:      (status)  => api.get('/api/pharmacy2/orders', { params: { status } }),
  order:       (id)      => api.get(`/api/pharmacy2/orders/${id}`),
  createOrder: (data)    => api.post('/api/pharmacy2/orders', data),
  updateOrder: (id, data)=> api.put(`/api/pharmacy2/orders/${id}/status`, data),
  addStock:    (id, qty) => api.post(`/api/pharmacy2/medicines/${id}/stock`, { quantity_change: qty }),
  stockLogs:   ()        => api.get('/api/pharmacy2/stock-logs'),
  analytics:   ()        => api.get('/api/pharmacy2/analytics'),
  chat:        (data)    => api.post('/api/pharmacy2/chat', data),
  prescriptions: ()      => api.get('/api/pharmacy2/prescriptions'),
}

// ── Reports ────────────────────────────────────────────────
export const reportApi = {
  forPatient:  (patientId)  => api.get(`/api/reports/patient/${patientId}`),
  approve:     (id, notes)  => api.put(`/api/reports/${id}/approve`, null, { params: { doctor_notes: notes } }),
}

// ── Agents (AI) ────────────────────────────────────────────
export const agentApi = {
  generatePlan:   (data)  => api.post('/api/agents/generate-plan',   data),
  generateReport: (data)  => api.post('/api/agents/generate-report', data),
  chat:           (data)  => api.post('/api/agents/chat',            data),
  checkDrugInteraction: (meds, allergies) =>
    api.post('/api/agents/drug-interaction', { medications: meds, allergies }),
}

export default api
