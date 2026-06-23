import express from "express";
import {
  addConversationMembers,
  addMessageReaction,
  createChannel,
  createRole,
  getChatMe,
  getChatUser,
  getConversationMessages,
  joinChannel,
  leaveConversation,
  listChannels,
  listGroups,
  listChatAuditLogs,
  listChatConversations,
  listChatUsers,
  listRoles,
  loginUser,
  markConversationRead,
  openDirectConversation,
  openGroupConversation,
  postBroadcastMessage,
  postConversationMessage,
  postDirectMessage,
  postMultiUserMessage,
  removeConversationMember,
  removeMessageReaction,
  registerUser,
  searchMessages,
  updateChatStatus,
  updateChatAvatarController,
  updateConversation,
  uploadConversationFile,
} from "../controllers/chatService.controllers.js";
import checkAuth from "../middlewares/check_auth.middleware.js";

const chatServiceRouter = express.Router();

chatServiceRouter.post("/auth/register", registerUser);
chatServiceRouter.post("/auth/login", loginUser);

chatServiceRouter.get("/me", checkAuth, getChatMe);
chatServiceRouter.patch("/me/status", checkAuth, updateChatStatus);
chatServiceRouter.patch("/me/avatar", checkAuth, updateChatAvatarController);

chatServiceRouter.get("/users", checkAuth, listChatUsers);
chatServiceRouter.get("/users/:userId", checkAuth, getChatUser);
chatServiceRouter.get("/roles", checkAuth, listRoles);
chatServiceRouter.post("/roles", checkAuth, createRole);
chatServiceRouter.get("/conversations", checkAuth, listChatConversations);
chatServiceRouter.get("/groups", checkAuth, listGroups);
chatServiceRouter.get("/channels", checkAuth, listChannels);
chatServiceRouter.post("/channels", checkAuth, createChannel);
chatServiceRouter.post("/channels/:channelId/join", checkAuth, joinChannel);
chatServiceRouter.get("/messages/search", checkAuth, searchMessages);
chatServiceRouter.get("/admin/audit-logs", checkAuth, listChatAuditLogs);
chatServiceRouter.post(
  "/conversations/direct/:userId",
  checkAuth,
  openDirectConversation
);
chatServiceRouter.post("/conversations/groups", checkAuth, openGroupConversation);
chatServiceRouter.patch("/conversations/:chatId", checkAuth, updateConversation);
chatServiceRouter.post(
  "/conversations/:chatId/members",
  checkAuth,
  addConversationMembers
);
chatServiceRouter.delete(
  "/conversations/:chatId/members/:userId",
  checkAuth,
  removeConversationMember
);
chatServiceRouter.post("/conversations/:chatId/leave", checkAuth, leaveConversation);
chatServiceRouter.post(
  "/conversations/:chatId/read",
  checkAuth,
  markConversationRead
);
chatServiceRouter.get(
  "/conversations/:chatId/messages",
  checkAuth,
  getConversationMessages
);
chatServiceRouter.post(
  "/conversations/:chatId/messages",
  checkAuth,
  postConversationMessage
);
chatServiceRouter.post("/messages/direct/:userId", checkAuth, postDirectMessage);
chatServiceRouter.post("/messages/multiple", checkAuth, postMultiUserMessage);
chatServiceRouter.post("/messages/broadcast", checkAuth, postBroadcastMessage);
chatServiceRouter.post(
  "/conversations/:chatId/files",
  checkAuth,
  uploadConversationFile
);
chatServiceRouter.post(
  "/conversations/:chatId/messages/:messageId/reactions",
  checkAuth,
  addMessageReaction
);
chatServiceRouter.delete(
  "/conversations/:chatId/messages/:messageId/reactions/:emoji",
  checkAuth,
  removeMessageReaction
);

export default chatServiceRouter;
