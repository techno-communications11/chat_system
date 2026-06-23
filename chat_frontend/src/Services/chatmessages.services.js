import api from "../api/axiosInstance";

export const getAllMessageServices = (userId, currentUserId) =>
  api.get(`/chat/messages/${userId}/${currentUserId}`);
