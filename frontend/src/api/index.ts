import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gkr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gkr_token');
      localStorage.removeItem('gkr_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data: any) => api.post('/auth/users', data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
  getRoles: () => api.get('/auth/roles'),
};

// Rooms
export const roomsAPI = {
  getAll: (params?: any) => api.get('/rooms', { params }),
  getById: (id: string) => api.get(`/rooms/${id}`),
  getFloors: () => api.get('/rooms/floors'),
  checkAvailability: (params: any) => api.get('/rooms/availability', { params }),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.put(`/rooms/${id}/status`, { status, reason }),
  update: (id: string, data: any) => api.put(`/rooms/${id}`, data),
  getPerformance: (params?: any) => api.get('/rooms/performance', { params }),
};

// Bookings
export const bookingsAPI = {
  getAll: (params?: any) => api.get('/bookings', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  create: (data: any) => api.post('/bookings', data),
  update: (id: string, data: any) => api.put(`/bookings/${id}`, data),
  checkIn: (id: string) => api.post(`/bookings/${id}/checkin`),
  checkOut: (id: string, data?: any) => api.post(`/bookings/${id}/checkout`, data || {}),
  cancel: (id: string, data: any) => api.post(`/bookings/${id}/cancel`, data),
  extend: (id: string, data: any) => api.post(`/bookings/${id}/extend`, data),
  getCalendar: (params: any) => api.get('/bookings/calendar', { params }),
};

// Customers
export const customersAPI = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
};

// Payments
export const paymentsAPI = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getPending: () => api.get('/payments/pending'),
  add: (data: any) => api.post('/payments', data),
};

// Expenses
export const expensesAPI = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
  // Employees
  getEmployees: () => api.get('/expenses/employees'),
  createEmployee: (data: any) => api.post('/expenses/employees', data),
  updateEmployee: (id: string, data: any) => api.put(`/expenses/employees/${id}`, data),
  // Salary
  getSalary: (params?: any) => api.get('/expenses/salary', { params }),
  addSalary: (data: any) => api.post('/expenses/salary', data),
  // Water bills
  getWaterBills: () => api.get('/expenses/water-bills'),
  createWaterBill: (data: any) => api.post('/expenses/water-bills', data),
  updateWaterBill: (id: string, data: any) => api.put(`/expenses/water-bills/${id}`, data),
};

// Reports
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMonthly: (params: any) => api.get('/reports/monthly', { params }),
  getYearly: (params?: any) => api.get('/reports/yearly', { params }),
  getOccupancy: (params?: any) => api.get('/reports/occupancy', { params }),
  getBookingSources: (params?: any) => api.get('/reports/booking-sources', { params }),
  getAuditLogs: (params?: any) => api.get('/reports/audit-logs', { params }),
  getNotifications: () => api.get('/reports/notifications'),
  markNotificationRead: (id: string) => api.put(`/reports/notifications/${id}/read`),
};

export default api;
