import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getCurrentUser: () => api.get('/auth/me'),
};

export const risksAPI = {
  getAll: (params) => api.get('/risks', { params }),
  getById: (id) => api.get(`/risks/${id}`),
  create: (data) => api.post('/risks', data),
  update: (id, data) => api.put(`/risks/${id}`, data),
  delete: (id) => api.delete(`/risks/${id}`),
  createReview: (id, data) => api.post(`/risks/${id}/reviews`, data),
  getReviews: (id) => api.get(`/risks/${id}/reviews`),
  getNextSlNo: (departmentId) => api.get(`/risks/next-sl-no/${departmentId}`),
  getNextId: () => api.get('/risks/next-id'),
};

export const actionsAPI = {
  getByRisk: (riskId) => api.get(`/actions/risk/${riskId}`),
  create: (riskId, data) => api.post(`/actions/risk/${riskId}`, data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
  getOverdue: () => api.get('/actions/overdue'),
};

export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getDepartments: () => api.get('/dashboard/departments'),
  updateInstructions: (id, data) => api.put(`/departments/${id}/instructions`, data),
  getDeptOverview: (data) => api.post('/ai/department-overview', data),
};

export const aiAPI = {
  articulateRisk: (data) => api.post('/ai/articulate-risk', data),
  generateRisk: (data) => api.post('/ai/generate-risk', data),
};


export const askMeAPI = {
  sendMessage: (data) => api.post('/ai/ask-me', data),
  uploadContextDocument: (data) => api.post('/documents/context-upload', data),
  getChatHistory: (params) => api.get('/ai/ask-me/history', { params }),
};

export const documentsAPI = {
  upload: (data) => api.post('/documents/upload', data),
  getAll: (params) => api.get('/documents', { params }),
  delete: (id) => api.delete(`/documents/${id}`),
};

export default api;
