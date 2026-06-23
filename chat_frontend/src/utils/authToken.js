import Cookies from "js-cookie";

const TOKEN_COOKIE_NAME = "token";
const TOKEN_STORAGE_KEY = "chat_auth_token";
const APP_STORAGE_KEY = "chat_app_name";

export const normalizeAuthToken = (value) => {
  const token = String(value || "").trim();
  return token.replace(/^Bearer\s+/i, "").trim();
};

export const getStoredAuthToken = () =>
  normalizeAuthToken(Cookies.get(TOKEN_COOKIE_NAME) || localStorage.getItem(TOKEN_STORAGE_KEY));

export const storeAuthToken = (value) => {
  const token = normalizeAuthToken(value);

  if (!token) return "";

  Cookies.set(TOKEN_COOKIE_NAME, token, { path: "/", sameSite: "lax" });
  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  return token;
};

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
  localStorage.removeItem(TOKEN_STORAGE_KEY);
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
