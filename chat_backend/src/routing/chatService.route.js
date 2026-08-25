import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controllers.js";
import {
  getChatMe,
  getChatSettings,
  updateChatSettings,
  updateChatStatus,
  updateChatAvatarController,
  listChatUsers,
  getChatUser,
  listRoles,
  createRole,
} from "../controllers/identity.controllers.js";
import {
  listChatConversations,
  listGroups,
  listChannels,
  createChannel,
  joinChannel,
  openDirectConversation,
  openGroupConversation,
  updateConversation,
  addConversationMembers,
  removeConversationMember,
  leaveConversation,
  transferOwnership,
  markConversationRead,
  clearConversationHistory,
} from "../controllers/conversation.controllers.js";
import {
  getConversationMessages,
  getConversationMessageInfo,
  searchMessages,
  postConversationMessage,
  patchConversationMessage,
  deleteConversationMessage,
  patchConversationMessagePin,
  postDirectMessage,
  postMultiUserMessage,
  postBroadcastMessage,
  uploadConversationFile,
  addMessageReaction,
  removeMessageReaction,
} from "../controllers/message.controllers.js";
import {
  startConversationCall,
  getActiveConversationCalls,
  respondConversationCall,
  endConversationCall,
} from "../controllers/call.controllers.js";
import { listChatAuditLogs } from "../controllers/audit.controllers.js";
import checkAuth from "../middlewares/check_auth.middleware.js";
import { requireLegacyAuthEnabled } from "../middlewares/platformSecurity.middleware.js";
import { authRateLimit } from "../middlewares/platformSecurity.middleware.js";

const chatServiceRouter = express.Router();

chatServiceRouter.post(
  "/auth/register",
  authRateLimit,
  requireLegacyAuthEnabled,
  registerUser,
);
chatServiceRouter.post(
  "/auth/login",
  authRateLimit,
  requireLegacyAuthEnabled,
  loginUser,
);

chatServiceRouter.get("/me", checkAuth, getChatMe);
chatServiceRouter.get("/me/settings", checkAuth, getChatSettings);
chatServiceRouter.patch("/me/settings", checkAuth, updateChatSettings);
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
  openDirectConversation,
);
chatServiceRouter.post(
  "/conversations/groups",
  checkAuth,
  openGroupConversation,
);
chatServiceRouter.patch(
  "/conversations/:chatId",
  checkAuth,
  updateConversation,
);
chatServiceRouter.post(
  "/conversations/:chatId/members",
  checkAuth,
  addConversationMembers,
);
chatServiceRouter.delete(
  "/conversations/:chatId/members/:userId",
  checkAuth,
  removeConversationMember,
);
chatServiceRouter.post(
  "/conversations/:chatId/leave",
  checkAuth,
  leaveConversation,
);
chatServiceRouter.post(
  "/conversations/:chatId/transfer-ownership",
  checkAuth,
  transferOwnership,
);
chatServiceRouter.post(
  "/conversations/:chatId/read",
  checkAuth,
  markConversationRead,
);
chatServiceRouter.delete(
  "/conversations/:chatId/messages",
  checkAuth,
  clearConversationHistory,
);
chatServiceRouter.get(
  "/conversations/:chatId/messages",
  checkAuth,
  getConversationMessages,
);
chatServiceRouter.get(
  "/conversations/:chatId/messages/:messageId/info",
  checkAuth,
  getConversationMessageInfo,
);
chatServiceRouter.post(
  "/conversations/:chatId/messages",
  checkAuth,
  postConversationMessage,
);
chatServiceRouter.patch(
  "/conversations/:chatId/messages/:messageId",
  checkAuth,
  patchConversationMessage,
);
chatServiceRouter.delete(
  "/conversations/:chatId/messages/:messageId",
  checkAuth,
  deleteConversationMessage,
);
chatServiceRouter.patch(
  "/conversations/:chatId/messages/:messageId/pin",
  checkAuth,
  patchConversationMessagePin,
);
chatServiceRouter.post(
  "/messages/direct/:userId",
  checkAuth,
  postDirectMessage,
);
chatServiceRouter.post("/messages/multiple", checkAuth, postMultiUserMessage);
chatServiceRouter.post("/messages/broadcast", checkAuth, postBroadcastMessage);
chatServiceRouter.post(
  "/conversations/:chatId/files",
  checkAuth,
  uploadConversationFile,
);
chatServiceRouter.post(
  "/conversations/:chatId/calls",
  checkAuth,
  startConversationCall,
);
chatServiceRouter.get("/calls/active", checkAuth, getActiveConversationCalls);
chatServiceRouter.post(
  "/conversations/:chatId/calls/:callId/end",
  checkAuth,
  endConversationCall,
);
chatServiceRouter.post(
  "/conversations/:chatId/calls/:callId/respond",
  checkAuth,
  respondConversationCall,
);
chatServiceRouter.post(
  "/conversations/:chatId/messages/:messageId/reactions",
  checkAuth,
  addMessageReaction,
);
chatServiceRouter.delete(
  "/conversations/:chatId/messages/:messageId/reactions/:emoji",
  checkAuth,
  removeMessageReaction,
);

export default chatServiceRouter;
