const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('sw_token');
}

async function request(method, path, data = null, signal = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers, signal };
  if (data) config.body = JSON.stringify(data);

  const res = await fetch(`${BASE}${path}`, config);
  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  get:    (path, signal)       => request('GET',    path, null, signal),
  post:   (path, data, signal) => request('POST',   path, data, signal),
  patch:  (path, data)         => request('PATCH',  path, data),
  delete: (path)               => request('DELETE', path),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (creds)   => api.post('/auth/login', creds),
  me:     ()        => api.get('/auth/me'),
  logout: ()        => api.post('/auth/logout'),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  getAll:        (params = {})      => api.get(`/bookings?${new URLSearchParams(params)}`),
  getSlots:      (date)             => api.get(`/bookings/slots?date=${date}`),
  create:        (data)             => api.post('/bookings', data),
  update:        (id, data)         => api.patch(`/bookings/${id}`, data),
  complete:      (id, data)         => api.post(`/bookings/${id}/complete`, data),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  getAll:   (params = {}) => api.get(`/customers?${new URLSearchParams(params)}`),
  getOne:   (id)          => api.get(`/customers/${id}`),
  update:   (id, data)    => api.patch(`/customers/${id}`, data),
  getStats: ()            => api.get('/customers/stats'),
};

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staffApi = {
  getAll:          ()         => api.get('/staff'),
  create:          (data)     => api.post('/staff', data),
  update:          (id, data) => api.patch(`/staff/${id}`, data),
  delete:          (id)       => api.delete(`/staff/${id}`),
  toggleAttendance:(id)       => api.patch(`/staff/${id}/attendance`, {}),
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryApi = {
  getAll:   ()             => api.get('/inventory'),
  create:   (data)         => api.post('/inventory', data),
  update:   (id, data)     => api.patch(`/inventory/${id}`, data),
  restock:  (id, qty)      => api.post(`/inventory/${id}/restock`, { qty }),
  delete:   (id)           => api.delete(`/inventory/${id}`),
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export const accountsApi = {
  getTransactions: (params = {}) => api.get(`/accounts/transactions?${new URLSearchParams(params)}`),
  getExpenses:     ()             => api.get('/accounts/expenses'),
  createExpense:   (data)         => api.post('/accounts/expenses', data),
  deleteExpense:   (id)           => api.delete(`/accounts/expenses/${id}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getAnalytics: () => api.get('/reports/analytics'),
  getPnL:       () => api.get('/reports/pnl'),
};
