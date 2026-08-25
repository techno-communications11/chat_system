import axios from "axios";
import Cookies from "js-cookie";
import { clearAuthToken, getStoredAuthToken, getStoredRefreshToken, storeAuthTokens } from "../utils/authToken";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

const API_LOGGING_ENABLED = import.meta.env.DEV || import.meta.env.VITE_API_LOGGING === "true";
let refreshRequest = null;

const refreshAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = axios.post(
      `${import.meta.env.VITE_API_URL || ""}/chat-service/auth/refresh`,
      { refreshToken: getStoredRefreshToken() },
    ).then((response) => {
      const data = response.data?.data || {};
      storeAuthTokens(data);
      return data.accessToken || data.token;
    }).finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
};

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
  async (error) => {
    const requestUrl = error?.config?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    logApi("error", {
      method: error.config?.method,
      url: requestUrl,
      status: error.response?.status || "NETWORK_ERROR",
      durationMs: Math.round(performance.now() - (error.config?.metadata?.startedAt || performance.now())),
      message: error.message,
    });

    const isRefreshRequest = requestUrl.includes("/auth/refresh");
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && getStoredRefreshToken() && !error.config?._retry) {
      error.config._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch {
        clearAuthToken();
      }
    } else if (error.response?.status === 401 && !isLoginRequest) {
      clearAuthToken();
      Cookies.remove("ip", { path: "/" });
      Cookies.remove("id", { path: "/" });
      sessionStorage.clear();
    }
    return Promise.reject(error);
  }
);

export default api;
