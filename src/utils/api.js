import axios from 'axios';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://api-inventory.isavralabel.com/al-hakim/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (category) => api.get(`/products/category/${category}`),
  getPromo: () => api.get('/products/promo'),
  create: (data) => api.post('/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/products/${id}`),
  
  // Product Images
  getImages: (id) => api.get(`/products/${id}/images`),
  uploadImages: (id, formData) => api.post(`/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteImage: (productId, imageId) => api.delete(`/products/${productId}/images/${imageId}`),
  
  // Product Variations
  getVariations: (id) => api.get(`/products/${id}/variations`),
  addVariation: (id, data) => api.post(`/products/${id}/variations`, data),
  updateVariation: (productId, variantId, data) => api.put(`/products/${productId}/variations/${variantId}`, data),
  deleteVariation: (productId, variantId) => api.delete(`/products/${productId}/variations/${variantId}`),
  
  // Product Add-ons
  getAddons: (id) => api.get(`/products/${id}/addons`),
  addAddon: (id, data) => api.post(`/products/${id}/addons`, data),
  updateAddon: (productId, addonId, data) => api.put(`/products/${productId}/addons/${addonId}`, data),
  deleteAddon: (productId, addonId) => api.delete(`/products/${productId}/addons/${addonId}`),
};

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addReview: (id, data) => api.post(`/orders/${id}/review`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addComplaint: (id, data) => api.post(`/orders/${id}/complaint`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadProof: (id, formData) => api.post(`/orders/${id}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createWithProof: (formData) => api.post('/orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createGuest: (formData) => api.post('/orders/guest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Kitchen Checklist
  getChecklist: (id) => api.get(`/orders/${id}/kitchen-checklist`),
  saveChecklist: (id, data) => api.post(`/orders/${id}/kitchen-checklist`, data),
};

export const voucherAPI = {
  getAll: () => api.get('/vouchers'),
  getById: (id) => api.get(`/vouchers/${id}`),
  create: (data) => api.post('/vouchers', data),
  update: (id, data) => api.put(`/vouchers/${id}`, data),
  delete: (id) => api.delete(`/vouchers/${id}`),
  validate: (code) => api.post('/vouchers/validate', { code }),
};

export const bannerAPI = {
  getAll: () => api.get('/banners'),
  create: (formData) => api.post('/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/banners/${id}`),
};

export const cashbackAPI = {
  getBalance: () => api.get('/cashback/balance'),
  getHistory: () => api.get('/cashback/history'),
  use: (amount) => api.post('/cashback/use', { amount }),
};

export const commissionAPI = {
  getBalance: () => api.get('/commission/balance'),
  getHistory: () => api.get('/commission/history'),
  getOrders: () => api.get('/commission/orders'),
};

export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getSales: (params) => api.get('/stats/sales', { params }),
  getProducts: () => api.get('/stats/products'),
  exportSales: (params) => api.get('/stats/export', {
    params,
    responseType: 'blob'
  }),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart', data),
  update: (id, data) => api.put(`/cart/${id}`, data),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart/clear'),
};

export default api;
