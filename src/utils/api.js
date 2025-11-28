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
  updatePaymentStatus: (id, data) => api.put(`/admin/orders/${id}/payment-status`, data),
  updateNotes: (id, data) => api.put(`/admin/orders/${id}/notes`, data),
  updateMarketingAdminNotes: (id, data) => api.put(`/marketing/orders/${id}/notes`, data),
  getInvoice: (id) => api.get(`/orders/${id}/invoice`),
  pinOrder: (id, is_pinned) => api.put(`/orders/${id}/pin`, { is_pinned }),
  getReview: (id) => api.get(`/orders/${id}/review`),
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
  // Kurir Checklist
  getKurirChecklist: (id) => api.get(`/orders/${id}/kurir-checklist`),
  saveKurirChecklist: (id, data) => api.post(`/orders/${id}/kurir-checklist`, data),
  // Operasional Checklist
  getOperasionalChecklist: (date) => api.get(`/operasional/checklist/${date}`),
  saveOperasionalChecklist: (date, data) => api.post(`/operasional/checklist/${date}`, data),
  // Reviews
  getReviews: (params) => api.get('/reviews', { params }),
  resolveReview: (id, type) => api.put(`/reviews/${id}/resolve`, { type }),
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
  getOrders: (params) => api.get('/commission/orders', { params }),
  withdraw: (data) => api.post('/commission/withdraw', data),
};

export const adminCommissionAPI = {
  getWithdrawals: (params) => api.get('/admin/commission-withdrawals', { params }),
  updateWithdrawalStatus: (id, data) => api.put(`/admin/commission-withdrawals/${id}`, data),
};

export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getSales: (params) => api.get('/stats/sales', { params }),
  getProducts: () => api.get('/stats/products'),
  exportSales: (params) =>
    api.get('/stats/export', {
      params,
      responseType: 'blob',
    }),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  toggleActive: (id, is_active) => api.put(`/users/${id}/toggle-active`, { is_active }),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart', data),
  update: (id, data) => api.put(`/cart/${id}`, data),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart/clear'),
};

export const cashFlowAPI = {
  getSummary: (params) => api.get('/cash-flow/summary', { params }),
  getTransactions: (params) => api.get('/cash-flow/transactions', { params }),
  createTransaction: (formData) => api.post('/cash-flow/transactions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateTransaction: (id, formData) => api.put(`/cash-flow/transactions/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteTransaction: (id) => api.delete(`/cash-flow/transactions/${id}`),
  getEditHistory: (id) => api.get(`/cash-flow/transactions/${id}/history`),
  exportExcel: (params) => api.get('/cash-flow/export', {
    params,
    responseType: 'blob',
  }),
};

export const companySettingsAPI = {
  get: () => api.get('/company-settings'),
  update: (formData) => api.put('/company-settings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const invoiceAPI = {
  getInvoiceData: (id) => api.get(`/orders/${id}/invoice`),
};

export const adminChecklistAPI = {
  getByDate: (date) => api.get(`/admin/checklist/${date}`),
  save: (date, data) => api.post(`/admin/checklist/${date}`, data),
};

export default api;
