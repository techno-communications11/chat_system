import {
  editChatMessage,
  deleteChatMessage,
  getChatMessages,
  getChatMessageInfo,
  pinChatMessage,
  searchChatMessages,
  sendBroadcastMessage,
  sendChatMessage,
  sendDirectChatMessage,
  sendMultiUserMessage,
} from "../Servicess/message.services.js";

export const getConversationMessageInfo = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Message info fetched",
    await getChatMessageInfo({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      messageId: req.params.messageId,
    }),
  ),
);
import { sendChatFile } from "../Servicess/file.services.js";
import {
  addChatReaction,
  removeChatReaction,
} from "../Servicess/reaction.services.js";
import {
  actorFrom,
  handleRequest,
  requireChatAdmin,
  sendSuccess,
} from "../helpers/controller.helpers.js";

export const getConversationMessages = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Conversation messages fetched",
    await getChatMessages({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      query: req.query,
    }),
  ),
);
export const searchMessages = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat messages searched",
    await searchChatMessages({ actor: actorFrom(req), query: req.query }),
  ),
);
export const postConversationMessage = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Message sent",
    await sendChatMessage({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      text: req.body?.text,
      replyTo: req.body?.replyTo,
      metadata: req.body?.metadata,
    }),
  ),
);
export const patchConversationMessage = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Message edited",
    await editChatMessage({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      text: req.body?.text,
    }),
  ),
);
export const deleteConversationMessage = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Message deleted",
    await deleteChatMessage({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      messageId: req.params.messageId,
    }),
  ),
);
export const patchConversationMessagePin = handleRequest(async (req, res) => {
  const data = await pinChatMessage({
    actor: actorFrom(req),
    chatId: req.params.chatId,
    messageId: req.params.messageId,
    pinned: req.body?.pinned,
  });
  return sendSuccess(
    res,
    data.metadata?.pinned ? "Message pinned" : "Message unpinned",
    data,
  );
});
export const postDirectMessage = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Direct message sent",
    await sendDirectChatMessage({
      actor: actorFrom(req),
      userId: req.params.userId,
      text: req.body?.text,
      replyTo: req.body?.replyTo,
      metadata: req.body?.metadata,
    }),
  ),
);
export const postMultiUserMessage = handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  return sendSuccess(
    res,
    "Multi-user message processed",
    await sendMultiUserMessage({
      actor,
      userIds: req.body?.userIds,
      text: req.body?.text,
    }),
  );
});
export const postBroadcastMessage = handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  return sendSuccess(
    res,
    "Broadcast message processed",
    await sendBroadcastMessage({
      actor,
      text: req.body?.text,
      search: req.body?.search,
    }),
  );
});
export const uploadConversationFile = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "File sent",
    await sendChatFile({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      stream: req,
      contentType:
        req.headers["x-file-content-type"] || req.headers["content-type"],
      contentLength: req.headers["content-length"],
      fileName: req.headers["x-file-name"],
    }),
  ),
);
export const addMessageReaction = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Reaction added",
    await addChatReaction({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      emoji: req.body?.emoji,
    }),
  ),
);
export const removeMessageReaction = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Reaction removed",
    await removeChatReaction({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      messageId: req.params.messageId,
      emoji: req.params.emoji,
    }),
  ),
);
