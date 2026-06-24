import {
  addChatReaction,
  addGroupConversationMembers,
  createChatChannel,
  createDirectConversation,
  createGroupConversation,
  getChatAuditLogs,
  getChatActor,
  getChatConnectionStatus,
  getChatConversations,
  getChatMessages,
  getChatUserProfile,
  getChatUsers,
  joinChatChannel,
  leaveChatConversation,
  listChatChannels,
  listChatGroups,
  markChatConversationRead,
  removeGroupConversationMember,
  searchChatMessages,
  removeChatReaction,
  sendBroadcastMessage,
  sendChatFile,
  sendChatMessage,
  sendDirectChatMessage,
  sendMultiUserMessage,
  updateChatPresence,
  updateChatAvatar,
  updateGroupConversation,
} from "../Servicess/chatProvider.services.js";
import {
  createChatRole,
  listChatRoles,
  loginChatUser,
  registerChatUser,
} from "../Servicess/chatUser.services.js";

const sendSuccess = (res, message, data, status = 200) =>
  res.status(status).json({
    status,
    success: true,
    message,
    data,
  });

const sendError = (res, error) => {
  const status = error.status || 500;

  return res.status(status).json({
    status,
    success: false,
    message: error.message || "Chat request failed",
    code: error.code,
    details: error.details,
  });
};

const requireChatAdmin = (actor) => {
  const role = String(actor.role || "").toLowerCase();

  if (!["admin", "superadmin", "super admin"].includes(role)) {
    const error = new Error("You do not have permission for this chat action");
    error.status = 403;
    error.code = "CHAT_FORBIDDEN";
    throw error;
  }
};

export const registerUser = async (req, res) => {
  try {
    const data = await registerChatUser({
      email: req.body?.email,
      username: req.body?.username,
      displayName: req.body?.displayName || req.body?.name,
      password: req.body?.password,
      roleName: req.body?.roleName || req.body?.role,
    });
    return sendSuccess(res, "Chat user registered", data, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

export const loginUser = async (req, res) => {
  try {
    const data = await loginChatUser({
      login: req.body?.login || req.body?.email || req.body?.username,
      password: req.body?.password,
    });
    return sendSuccess(res, "Chat login successful", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listRoles = async (req, res) => {
  try {
    const actor = getChatActor(req);
    requireChatAdmin(actor);
    const data = await listChatRoles();
    return sendSuccess(res, "Chat roles fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const createRole = async (req, res) => {
  try {
    const actor = getChatActor(req);
    requireChatAdmin(actor);
    const data = await createChatRole({
      name: req.body?.name,
      description: req.body?.description,
      permissions: req.body?.permissions,
    });
    return sendSuccess(res, "Chat role created", data, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getChatMe = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await getChatConnectionStatus({ actor });
    return sendSuccess(res, "Chat connection status", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateChatStatus = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await updateChatPresence({
      actor,
      presence: req.body?.presence || req.body?.status,
    });
    return sendSuccess(res, "Chat status updated", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateChatAvatarController = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const hasStreamUpload =
      req.headers["content-type"] &&
      !String(req.headers["content-type"]).includes("application/json");
    const data = await updateChatAvatar({
      actor,
      avatarUrl: req.body?.avatarUrl || req.body?.avatar_url || req.body?.imageUrl,
      stream: hasStreamUpload ? req : null,
      contentType: req.headers["x-file-content-type"] || req.headers["content-type"],
      fileName: req.headers["x-file-name"],
    });
    return sendSuccess(res, "Profile picture updated", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listChatUsers = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await getChatUsers({ actor, query: req.query });
    return sendSuccess(res, "Chat users fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getChatUser = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await getChatUserProfile({
      actor,
      userId: req.params.userId,
    });
    return sendSuccess(res, "Chat user profile fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listChatConversations = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await getChatConversations({ actor });
    return sendSuccess(res, "Chat conversations fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const openDirectConversation = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await createDirectConversation({
      actor,
      userId: req.params.userId,
    });
    return sendSuccess(res, "Direct conversation opened", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const openGroupConversation = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await createGroupConversation({
      actor,
      title: req.body?.title,
      userIds: req.body?.userIds,
    });
    return sendSuccess(res, "Group conversation created", data, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listGroups = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await listChatGroups({ actor });
    return sendSuccess(res, "Chat groups fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listChannels = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await listChatChannels({ actor });
    return sendSuccess(res, "Chat channels fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const createChannel = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await createChatChannel({
      actor,
      name: req.body?.name,
      description: req.body?.description,
      visibility: req.body?.visibility,
      userIds: req.body?.userIds || [],
    });
    return sendSuccess(res, "Chat channel created", data, 201);
  } catch (error) {
    return sendError(res, error);
  }
};

export const joinChannel = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await joinChatChannel({
      actor,
      channelId: req.params.channelId,
    });
    return sendSuccess(res, "Chat channel joined", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateConversation = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await updateGroupConversation({
      actor,
      chatId: req.params.chatId,
      title: req.body?.title,
    });
    return sendSuccess(res, "Conversation updated", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const addConversationMembers = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await addGroupConversationMembers({
      actor,
      chatId: req.params.chatId,
      userIds: req.body?.userIds,
    });
    return sendSuccess(res, "Conversation members added", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const removeConversationMember = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await removeGroupConversationMember({
      actor,
      chatId: req.params.chatId,
      userId: req.params.userId,
    });
    return sendSuccess(res, "Conversation member removed", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const leaveConversation = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await leaveChatConversation({
      actor,
      chatId: req.params.chatId,
    });
    return sendSuccess(res, "Conversation left", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await markChatConversationRead({
      actor,
      chatId: req.params.chatId,
    });
    return sendSuccess(res, "Conversation marked read", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await getChatMessages({
      actor,
      chatId: req.params.chatId,
      query: req.query,
    });
    return sendSuccess(res, "Conversation messages fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const searchMessages = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await searchChatMessages({
      actor,
      query: req.query,
    });
    return sendSuccess(res, "Chat messages searched", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const postConversationMessage = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await sendChatMessage({
      actor,
      chatId: req.params.chatId,
      text: req.body?.text,
      replyTo: req.body?.replyTo,
      metadata: req.body?.metadata,
    });
    return sendSuccess(res, "Message sent", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const postDirectMessage = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await sendDirectChatMessage({
      actor,
      userId: req.params.userId,
      text: req.body?.text,
      metadata: req.body?.metadata,
    });
    return sendSuccess(res, "Direct message sent", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const postMultiUserMessage = async (req, res) => {
  try {
    const actor = getChatActor(req);
    requireChatAdmin(actor);
    const data = await sendMultiUserMessage({
      actor,
      userIds: req.body?.userIds,
      text: req.body?.text,
    });
    return sendSuccess(res, "Multi-user message processed", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const postBroadcastMessage = async (req, res) => {
  try {
    const actor = getChatActor(req);
    requireChatAdmin(actor);
    const data = await sendBroadcastMessage({
      actor,
      text: req.body?.text,
      search: req.body?.search,
    });
    return sendSuccess(res, "Broadcast message processed", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const uploadConversationFile = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await sendChatFile({
      actor,
      chatId: req.params.chatId,
      stream: req,
      contentType: req.headers["x-file-content-type"] || req.headers["content-type"],
      contentLength: req.headers["content-length"],
      fileName: req.headers["x-file-name"],
    });
    return sendSuccess(res, "File sent", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const addMessageReaction = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await addChatReaction({
      actor,
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      emoji: req.body?.emoji,
    });
    return sendSuccess(res, "Reaction added", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const removeMessageReaction = async (req, res) => {
  try {
    const actor = getChatActor(req);
    const data = await removeChatReaction({
      actor,
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      emoji: req.params.emoji,
    });
    return sendSuccess(res, "Reaction removed", data);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listChatAuditLogs = async (req, res) => {
  try {
    const actor = getChatActor(req);
    requireChatAdmin(actor);
    const data = await getChatAuditLogs({
      actor,
      query: req.query,
    });
    return sendSuccess(res, "Chat audit logs fetched", data);
  } catch (error) {
    return sendError(res, error);
  }
};
