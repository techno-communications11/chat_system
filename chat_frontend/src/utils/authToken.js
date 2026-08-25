import Cookies from "js-cookie";

const TOKEN_COOKIE_NAME = "token";
const TOKEN_STORAGE_KEY = "chat_auth_token";
const REFRESH_TOKEN_STORAGE_KEY = "chat_refresh_token";
const APP_STORAGE_KEY = "chat_app_name";

export const normalizeAuthToken = (value) => {
  const token = String(value || "").trim();
  return token.replace(/^Bearer\s+/i, "").trim();
};

export const getStoredAuthToken = () =>
  normalizeAuthToken(
    sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
    // One-time compatibility read for deployments upgrading from persistent storage.
    Cookies.get(TOKEN_COOKIE_NAME) ||
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );

export const storeAuthToken = (value) => {
  const token = normalizeAuthToken(value);

  if (!token) return "";

  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  Cookies.remove(TOKEN_COOKIE_NAME, { path: "/" });
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  return token;
};

export const storeAuthTokens = ({ accessToken, token, refreshToken } = {}) => {
  const access = storeAuthToken(accessToken || token);
  const refresh = normalizeAuthToken(refreshToken);
  if (refresh) sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
  return { accessToken: access, refreshToken: refresh };
};

export const getStoredRefreshToken = () =>
  normalizeAuthToken(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY));

export const getStoredChatAppName = () =>
  localStorage.getItem(APP_STORAGE_KEY) || "chat_system";

export const storeChatAppName = (value) => {
  const appName = String(value || "").trim();

  if (!appName) return getStoredChatAppName();

  localStorage.setItem(APP_STORAGE_KEY, appName);

  return appName;
};

export const clearAuthToken = () => {
  Cookies.remove(TOKEN_COOKIE_NAME, { path: "/" });
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

const decodeBase64Url = (value) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const getTokenPayload = () => {
  const token = getStoredAuthToken();
  const payload = token?.split(".")?.[1];

  if (!payload) return null;

  try {
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
};

export const getTokenUser = () => {
  const payload = getTokenPayload();

  if (!payload) return null;

  const id =
    payload.id ||
    payload.userId ||
    payload.user_id ||
    payload.appUserId ||
    payload.sub ||
    "";
  const email =
    payload.email ||
    payload.userEmail ||
    payload.user_email ||
    payload.mail ||
    payload.preferred_username ||
    "";
  const name =
    payload.name ||
    payload.displayName ||
    payload.display_name ||
    payload.username ||
    email ||
    String(id || "");

  return {
    ...payload,
    id: String(id || ""),
    userId: String(id || ""),
    user_id: String(id || ""),
    email,
    email_id: email,
    name,
    displayName: name,
    display_name: name,
    username: payload.username || email || String(id || ""),
    role: payload.role,
    roles: payload.roles || (payload.role ? [payload.role] : []),
  };
};

export const getTokenEmail = () => {
  const payload = getTokenPayload();

  return (
    payload?.email ||
    payload?.userEmail ||
    payload?.user_email ||
    payload?.mail ||
    payload?.preferred_username ||
    payload?.sub ||
    ""
  );
};
