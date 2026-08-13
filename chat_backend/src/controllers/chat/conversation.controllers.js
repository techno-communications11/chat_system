import {
  addGroupConversationMembers,
  clearChatHistory,
  createChatChannel,
  createDirectConversation,
  createGroupConversation,
  getChatConversations,
  joinChatChannel,
  leaveChatConversation,
  listChatChannels,
  listChatGroups,
  markChatConversationRead,
  removeGroupConversationMember,
  updateGroupConversation,
} from "../../Servicess/chat/conversation.services.js";
import { actorFrom, handleRequest, sendSuccess } from "./controller.helpers.js";

export const listChatConversations = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat conversations fetched",
    await getChatConversations({ actor: actorFrom(req) }),
  ),
);
export const listGroups = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat groups fetched",
    await listChatGroups({ actor: actorFrom(req) }),
  ),
);
export const listChannels = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat channels fetched",
    await listChatChannels({ actor: actorFrom(req) }),
  ),
);

export const createChannel = handleRequest(async (req, res) => {
  const data = await createChatChannel({
    actor: actorFrom(req),
    name: req.body?.name,
    description: req.body?.description,
    visibility: req.body?.visibility,
    userIds: req.body?.userIds || [],
  });
  return sendSuccess(res, "Chat channel created", data, 201);
});
export const joinChannel = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat channel joined",
    await joinChatChannel({
      actor: actorFrom(req),
      channelId: req.params.channelId,
    }),
  ),
);
export const openDirectConversation = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Direct conversation opened",
    await createDirectConversation({
      actor: actorFrom(req),
      userId: req.params.userId,
    }),
  ),
);
export const openGroupConversation = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Group conversation created",
    await createGroupConversation({
      actor: actorFrom(req),
      title: req.body?.title,
      userIds: req.body?.userIds,
    }),
    201,
  ),
);
export const updateConversation = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation updated",
    await updateGroupConversation({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      title: req.body?.title,
    }),
  ),
);
export const addConversationMembers = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation members added",
    await addGroupConversationMembers({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      userIds: req.body?.userIds,
    }),
  ),
);
export const removeConversationMember = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation member removed",
    await removeGroupConversationMember({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      userId: req.params.userId,
    }),
  ),
);
export const leaveConversation = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation left",
    await leaveChatConversation({
      actor: actorFrom(req),
      chatId: req.params.chatId,
    }),
  ),
);
export const markConversationRead = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation marked read",
    await markChatConversationRead({
      actor: actorFrom(req),
      chatId: req.params.chatId,
    }),
  ),
);

export const clearConversationHistory = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat history cleared for this account",
    await clearChatHistory({ actor: actorFrom(req), chatId: req.params.chatId }),
  ),
);
