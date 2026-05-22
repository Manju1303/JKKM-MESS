import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jkkm_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jkkm_token');
      localStorage.removeItem('jkkm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: unknown) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getStats: () => api.get('/inventory/stats'),
  getDashboard: () => api.get('/inventory/dashboard'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getExpiringSoon: (days?: number) => api.get(`/inventory/expiring-soon${days ? `?days=${days}` : ''}`),
  getMovements: () => api.get('/inventory/movements'),
  addStock: (data: unknown) => api.post('/inventory', data),
};

export const productsAPI = {
  getAll: (type?: string) => api.get(`/products${type ? `?type=${type}` : ''}`),
  getById: (id: number) => api.get(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  getCategories: () => api.get('/products/categories'),
  create: (data: unknown) => api.post('/products', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
};

export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
  getById: (id: number) => api.get(`/suppliers/${id}`),
  getStats: (id: number) => api.get(`/suppliers/${id}/stats`),
  create: (data: unknown) => api.post('/suppliers', data),
  update: (id: number, data: unknown) => api.put(`/suppliers/${id}`, data),
};

export const purchasesAPI = {
  getAll: () => api.get('/purchases'),
  getById: (id: number) => api.get(`/purchases/${id}`),
  getMonthlyExpenses: () => api.get('/purchases/expenses/monthly'),
  create: (data: unknown) => api.post('/purchases', data),
  approve: (id: number) => api.post(`/purchases/${id}/approve`),
};

export const kitchenAPI = {
  issueStock: (data: unknown) => api.post('/kitchen/issue', data),
  getTodayIssues: () => api.get('/kitchen/today'),
  getHistory: (days?: number) => api.get(`/kitchen/history${days ? `?days=${days}` : ''}`),
  getAnalytics: () => api.get('/kitchen/analytics'),
};

export const consumptionAPI = {
  getDaily: (date?: string) => api.get(`/consumption/daily${date ? `?date=${date}` : ''}`),
  getTrends: () => api.get('/consumption/trends'),
  getTopItems: () => api.get('/consumption/top-items'),
};

export const reportsAPI = {
  getAll: () => api.get('/reports'),
  generateDaily: (date: string) => api.post('/reports/daily', { date }),
  generateMonthly: (year: number, month: number) => api.post('/reports/monthly', { year, month }),
  generateInventoryValuation: () => api.post('/reports/inventory'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getRoles: () => api.get('/users/roles'),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  deactivate: (id: number) => api.delete(`/users/${id}`),
};

export const aiAPI = {
  getPredictions: () => api.get('/ai/predictions'),
  predictStock: (productId: number, days?: number) => api.get(`/ai/predict/${productId}${days ? `?days=${days}` : ''}`),
  getInsights: () => api.get('/ai/insights'),
  getReorderSuggestions: () => api.get('/ai/reorder-suggestions'),
  getAnomalies: () => api.get('/ai/anomalies'),
};

export const attendanceAPI = {
  getAll: (days?: number) => api.get(`/attendance${days ? `?days=${days}` : ''}`),
  getStats: () => api.get('/attendance/stats'),
  getWeeklyTrend: () => api.get('/attendance/weekly-trend'),
  create: (data: unknown) => api.post('/attendance', data),
  update: (id: number, data: unknown) => api.put(`/attendance/${id}`, data),
};

export default api;
