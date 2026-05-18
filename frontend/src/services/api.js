// In production (Render), VITE_API_BASE_URL is set to the backend URL.
// In dev, the Vite proxy forwards /api to localhost:8000 so BASE_URL stays as /api/v1.
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_PATH ||
  '/api/v1';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export const getToken = () => localStorage.getItem('access_token');
export const setToken = (t) => localStorage.setItem('access_token', t);
export const clearToken = () => localStorage.removeItem('access_token');

export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
export const apiFetch = async (endpoint, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    clearToken();
    window.dispatchEvent(new Event('auth-change'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let message = errorData.error || errorData.detail || errorData.message;
    if (!message && errorData && typeof errorData === 'object') {
      const firstValue = Object.values(errorData)[0];
      if (Array.isArray(firstValue) && firstValue.length > 0) message = String(firstValue[0]);
      else if (firstValue != null) message = String(firstValue);
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json();
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authService = {
  register: (data) => apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),

  login: async (data) => {
    const res = await apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify(data) });
    setToken(res.access);
    window.dispatchEvent(new Event('auth-change'));
    return res;
  },

  logout: async () => {
    try { await apiFetch('/auth/logout/', { method: 'POST' }); } catch (_) {}
    clearToken();
    window.dispatchEvent(new Event('auth-change'));
  },
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export const analyticsService = {
  cashflow:          ()            => apiFetch('/cashflow/'),
  monthlySummary:    (year)        => apiFetch(`/monthly-summary/${year ? `?year=${year}` : ''}`),
  categoryBreakdown: ()            => apiFetch('/spending-by-category/'),
  topMerchants:      (limit = 10)  => apiFetch(`/top-merchants/?limit=${limit}`),
  subscriptions:     ()            => apiFetch('/subscriptions/'),
  anomalies:         ()            => apiFetch('/anomalies/'),
  status:            ()            => apiFetch('/status/'),
};

// ---------------------------------------------------------------------------
// AI / Retrieval
// ---------------------------------------------------------------------------
export const aiService = {
  ask:      (question, k = 8) => apiFetch('/ask/',      { method: 'POST', body: JSON.stringify({ question, k }) }),
  retrieve: (question, k = 8) => apiFetch('/retrieve/', { method: 'POST', body: JSON.stringify({ question, k }) }),
};
