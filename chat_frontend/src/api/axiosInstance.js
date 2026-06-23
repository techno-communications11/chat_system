import axios from "axios";
import Cookies from "js-cookie";
import { clearAuthToken, getStoredAuthToken } from "../utils/authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

// REQUEST → attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE → logout on token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      clearAuthToken();
      Cookies.remove("ip", { path: "/" });
      Cookies.remove("id", { path: "/" });
      sessionStorage.clear();
    }
    return Promise.reject(error);
  }
);

export default api;
