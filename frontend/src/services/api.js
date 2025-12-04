import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

export const customerAPI = {
  getProfile: () => api.get("/customers/me"),
  updateProfile: (data) => api.put("/customers/me", data),
  getDashboard: () => api.get("/customers/me/dashboard"),
  getBookingHistory: () => api.get("/customers/me/bookings"),
  getLoyaltyHistory: (limit = 20) =>
    api.get(`/customers/me/loyalty?limit=${limit}`),
  redeemPoints: (data) => api.post("/customers/me/loyalty/redeem", data),
};

export const flightAPI = {
  search: (params) => api.post("/flights/search", params),
  getDetails: (id) => api.get(`/flights/${id}`),
  getPriceHistory: (id, days = 7) =>
    api.get(`/flights/${id}/price-history?days=${days}`),
  getRoutePricing: (route) => api.get(`/flights/routes/${route}/pricing`),
};

export const bookingAPI = {
  create: (data) => api.post("/bookings", data),
  get: (id) => api.get(`/bookings/${id}`),
  getUpcoming: () => api.get("/bookings/upcoming"),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
};

export const paymentAPI = {
  process: (data) => api.post("/payments", data),
  get: (id) => api.get(`/payments/${id}`),
};

export const reviewAPI = {
  submit: (data) => api.post("/reviews", data),
  getFlightReviews: (flightId) => api.get(`/flights/${flightId}/reviews`),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`),
};

export const adminAPI = {
  getAllFlights: () => api.get("/admin/flights"),
  addFlight: (data) => api.post("/admin/flights", data),
  cancelFlight: (flightId, reason) =>
    api.post(`/admin/flights/${flightId}/cancel`, { reason }),
  updateFlight: (flightId, data) => api.put(`/admin/flights/${flightId}`, data),

  refreshPrice: (flightId) => api.post(`/admin/pricing/refresh/${flightId}`),
  refreshAllPrices: () => api.post("/admin/pricing/refresh-all"),
  getPricingInsights: (flightId) =>
    api.get(`/admin/pricing/insights/${flightId}`),

  getRevenueAnalytics: (start, end) =>
    api.get(`/admin/analytics/revenue?start=${start}&end=${end}`),
  getRouteAnalytics: (limit = 10) =>
    api.get(`/admin/analytics/routes?limit=${limit}`),
  getRoutePerformance: () => api.get("/admin/analytics/routes/performance"),
  getLoyaltyAnalytics: () => api.get("/admin/analytics/loyalty"),
  getPaymentAnalytics: (days = 30) =>
    api.get(`/admin/analytics/payments?days=${days}`),
  getAbandonedCarts: (hours = 24) =>
    api.get(`/admin/analytics/abandoned-carts?hours=${hours}`),
  getPriceTrends: (route, days = 30) =>
    api.get(`/admin/analytics/price-trends?route=${route}&days=${days}`),
};

export default api;
