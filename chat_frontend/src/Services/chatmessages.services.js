import api from "../api/axiosInstance";

export const getAllMessageServices = (userId, currentUserId) =>
  api.get(`/chat-service/conversations/${encodeURIComponent(userId)}/messages`, {
    params: currentUserId ? { currentUserId } : undefined,
  });
