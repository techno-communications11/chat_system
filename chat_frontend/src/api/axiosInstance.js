import axios from "axios";
import Cookies from "js-cookie";
import { clearAuthToken, getStoredAuthToken } from "../utils/authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

const API_LOGGING_ENABLED = import.meta.env.DEV || import.meta.env.VITE_API_LOGGING === "true";

const logApi = (event, details) => {
  if (!API_LOGGING_ENABLED) return;
  const method = String(details.method || "GET").toUpperCase();
  const url = details.url || "";
  const label = `[API ${event}] ${method} ${url}`;
  if (event === "error") {
    console.error(label, details);
  } else {
    console.info(label, details);
  }
};

// REQUEST → attach token automatically
api.interceptors.request.use(
  (config) => {
    config.metadata = { ...(config.metadata || {}), startedAt: performance.now() };
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logApi("request", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
    });
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE → logout on token expiry
api.interceptors.response.use(
  (response) => {
    logApi("response", {
      method: response.config?.method,
      url: response.config?.url,
      status: response.status,
      durationMs: Math.round(performance.now() - (response.config?.metadata?.startedAt || performance.now())),
    });
    return response;
  },
  (error) => {
    const requestUrl = error?.config?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    logApi("error", {
      method: error.config?.method,
      url: requestUrl,
      status: error.response?.status || "NETWORK_ERROR",
      durationMs: Math.round(performance.now() - (error.config?.metadata?.startedAt || performance.now())),
      message: error.message,
    });

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
