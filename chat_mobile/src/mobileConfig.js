import axios from "axios";
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:4701";
export const APP_NAME = process.env.EXPO_PUBLIC_CHAT_APP_NAME || "chat_system";
export const TOKEN_KEY = "pingly.mobile.accessToken";
export const USER_KEY = "pingly.mobile.user";
export const api = axios.create({ baseURL: API_URL, timeout: 15000 });
export const dataOf = (response) =>
  response?.data?.data ?? response?.data ?? {};
export const chatIdOf = (item) =>
  String(item?.chatId || item?.chat_id || item?.id || "");
export const titleOf = (item) =>
  item?.title ||
  item?.name ||
  item?.display_name ||
  item?.displayName ||
  "Conversation";
export const textOf = (item) => item?.text || item?.body || item?.content || "";
export const idOf = (item, index) =>
  String(item?.id || item?.messageId || item?.message_id || index);
export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  "x-chat-app-name": APP_NAME,
});
export const requestOptions = (token) => ({ headers: authHeaders(token) });
export const messageIdOf = (item) =>
  String(item?.id || item?.messageId || item?.message_id || "");
export const userIdOf = (item) =>
  String(item?.id || item?.userId || item?.user_id || item?.appUserId || "");
   