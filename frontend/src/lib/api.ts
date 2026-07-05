import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/reports/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => api.get("/reports/"),
  get: (id: number) => api.get(`/reports/${id}`),
  delete: (id: number) => api.delete(`/reports/${id}`),
};
