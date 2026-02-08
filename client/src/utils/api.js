export function getToken() {
  return localStorage.getItem('token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(path, opts = {}) {
  const { method = 'GET', body, isForm = false } = opts;
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let fetchBody = undefined;
  if (body !== undefined) {
    if (isForm) {
      fetchBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }
  }

  const res = await fetch('${BASE_URL}${path}', { method, headers, body: fetchBody });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  forgotPassword: (payload) => request('/api/auth/forgot-password', { method: 'POST', body: payload }),
  verifyOtp: (payload) => request('/api/auth/verify-otp', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: payload }),

  dashboard: () => request('/api/stats/dashboard'),
  statistics: () => request('/api/stats/statistics'),

  products: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (formData) => request('/api/products/create', { method: 'POST', body: formData, isForm: true }),
  uploadProductsCsv: (formData) => request('/api/products/upload-csv', { method: 'POST', body: formData, isForm: true }),
  buyProduct: (id, payload) => request(`/api/products/buy/${id}`, { method: 'POST', body: payload }),

  invoices: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/invoices${qs ? `?${qs}` : ''}`);
  },
  invoiceSummary: () => request('/api/invoices/summary'),
  updateInvoiceStatus: (id, payload) => request(`/api/invoices/${id}/status`, { method: 'PATCH', body: payload }),
  invoice: (id) => request(`/api/invoices/${id}`),
  deleteInvoice: (id) => request(`/api/invoices/${id}`, { method: 'DELETE' }),

  me: () => request('/api/settings/me'),
  updateProfile: (payload) => request('/api/settings/profile', { method: 'PATCH', body: payload }),
  updatePassword: (payload) => request('/api/settings/password', { method: 'PATCH', body: payload }),
  getLayout: () => request('/api/settings/layout'),
  setLayout: (payload) => request('/api/settings/layout', { method: 'PUT', body: payload })
};

// Backward-compatible default export (some pages import `api` as default)
export default api;
