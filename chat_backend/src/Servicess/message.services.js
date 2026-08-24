import { Op } from "sequelize";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatMessage from "../modules/chatMessage.module.js";
import ChatMessageReaction from "../modules/chatMessageReaction.module.js";
import { writeChatAuditLog } from "./chatAudit.services.js";
import {
  notifyConversationMessage,
  notifyConversationMessageUpdate,
} from "../realtime/chatSocket.js";
import {
  provider,
  normalizeLimit,
  normalizeMessagePage,
  toMessage,
  getMessageWithReactions,
  getConversationParticipantUserIds,
  assertString,
  ensureLocalIdentity,
  getConversationForMember,
  getParticipantForMember,
  ChatServiceError,
} from "../helpers/chat.helpers.js";

export const searchChatMessages = async ({ actor, query = {} }) => {
  const identity = await ensureLocalIdentity(actor);
  const search = String(query.search || query.q || "").trim();
  const type = String(query.type || "").trim().toLowerCase();
  const limit = normalizeLimit(query.limit, 25, 100);

  if (!type) {
    assertString(search, "search");
  }

  const memberships = await ChatConversationParticipant.findAll({
    where: { chatIdentityId: identity.id },
    include: [
      {
        model: ChatConversation,
        as: "conversation",
        where: { appName: actor.appName },
        attributes: [],
      },
    ],
    attributes: ["conversationId", "clearedAt"],
  });
  const conversationIds = memberships.map((membership) => membership.conversationId);

  if (conversationIds.length === 0) {
    return { data: [], messages: [], pagination: { limit, hasMore: false } };
  }

  const visibleConversationFilters = memberships.map((membership) => ({
    conversationId: membership.conversationId,
    ...(membership.clearedAt ? { createdAt: { [Op.gt]: membership.clearedAt } } : {}),
  }));
  const where = { [Op.or]: visibleConversationFilters };

  if (search) {
    where.text = { [Op.like]: `%${search}%` };
  }

  const messageFetchLimit = type ? Math.min(limit * 5, 500) : limit;
  const messages = await ChatMessage.findAll({
    where,
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: messageFetchLimit,
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "search_messages",
    metadata: { search, type: type || undefined },
  });

  const data = messages
    .map(toMessage)
    .filter((message) => {
      if (type === "calls") return message.metadata?.kind === "call_history";
      if (type === "media") {
        const metadata = message.metadata || {};
        return Boolean(
          metadata.type === "file" ||
            metadata.file ||
            metadata.attachment ||
            (Array.isArray(metadata.files) && metadata.files.length > 0) ||
            (Array.isArray(metadata.attachments) && metadata.attachments.length > 0),
        );
      }
      if (type === "calls_media") {
        const metadata = message.metadata || {};
        return Boolean(
          metadata.kind === "call_history" ||
            metadata.type === "file" ||
            metadata.file ||
            metadata.attachment ||
            (Array.isArray(metadata.files) && metadata.files.length > 0) ||
            (Array.isArray(metadata.attachments) && metadata.attachments.length > 0),
        );
      }
      return true;
    })
    .slice(0, limit);

  return {
    data,
    messages: data,
    pagination: {
      limit,
      hasMore: data.length === limit,
    },
  };
};

export const getChatMessages = async ({ actor, chatId, query = {} }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({ chatId, identityId: identity.id, appName: actor.appName });
  const conversationId = participant.conversation.id;

  const limit = normalizeLimit(query.limit, 50, 100);
  const where = { conversationId };
  const createdAtFilters = [];

  if (participant.clearedAt) {
    createdAtFilters.push({ [Op.gt]: participant.clearedAt });
  }

  if (query.before) {
    const cursorMessage = await ChatMessage.findOne({
      where: {
        id: query.before,
        conversationId,
      },
    });

    if (cursorMessage) {
      createdAtFilters.push({ [Op.lt]: cursorMessage.createdAt });
    }
  }

  if (createdAtFilters.length === 1) where.createdAt = createdAtFilters[0];
  if (createdAtFilters.length > 1) where[Op.and] = createdAtFilters.map((createdAt) => ({ createdAt }));

  const messages = await ChatMessage.findAll({
    where,
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: limit + 1,
  });

  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId },
    attributes: ["chatIdentityId", "lastReadAt"],
  });
  const serializeMessage = (message) => {
    const recipients = participants.filter(
      (participant) => Number(participant.chatIdentityId) !== Number(message.senderIdentityId),
    );
    const seenByAll =
      recipients.length > 0 &&
      recipients.every(
        (participant) =>
          participant.lastReadAt &&
          new Date(participant.lastReadAt).getTime() >= new Date(message.createdAt).getTime(),
      );
    return {
      ...toMessage(message),
      deliveryStatus: seenByAll ? "seen" : "sent",
    };
  };

  await ChatConversationParticipant.update(
    { lastReadAt: new Date() },
    {
      where: {
        conversationId,
        chatIdentityId: identity.id,
      },
    },
  );

  return {
    chatId: String(chatId),
    ...normalizeMessagePage(messages, limit, serializeMessage),
  };
};

export const sendChatMessage = async ({ actor, chatId, text, replyTo, metadata }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  assertString(text, "text");

  const message = await ChatMessage.create({
    conversationId: conversation.id,
    senderIdentityId: identity.id,
    text: text.trim(),
    replyToMessageId: replyTo || null,
    metadata: metadata || null,
  });

  await conversation.update({ lastMessageAt: message.createdAt });
  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "send_message",
    targetChatId: conversation.id,
    metadata: { messageId: message.id },
  });

  const fullMessage = await ChatMessage.findByPk(message.id, {
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
  });

  const messagePayload = toMessage(fullMessage);
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
  });
  const participantUserIds = participants
    .map((participant) => participant.identity?.appUserId)
    .filter(Boolean);

  await notifyConversationMessage({
    appName: actor.appName,
    conversationId: conversation.id,
    message: messagePayload,
    participantUserIds,
  });

  return messagePayload;
};

export const editChatMessage = async ({ actor, chatId, messageId, text }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversationId = conversation.id;
  assertString(messageId, "messageId");
  assertString(text, "text");

  const message = await ChatMessage.findOne({
    where: {
      id: messageId,
      conversationId: conversation.id,
      senderIdentityId: identity.id,
    },
  });

  if (!message) {
    throw new ChatServiceError("Message not found or cannot be edited", {
      status: 404,
      code: "CHAT_MESSAGE_NOT_EDITABLE",
    });
  }

  await message.update({
    text: text.trim(),
    metadata: {
      ...(message.metadata || {}),
      edited: true,
      editedAt: new Date().toISOString(),
    },
  });

  const fullMessage = await ChatMessage.findByPk(message.id, {
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "edit_message",
    targetChatId: conversation.id,
    metadata: { messageId: message.id },
  });

  return toMessage(fullMessage);
};

export const deleteChatMessage = async ({ actor, chatId, messageId }) => {
  const identity = await ensureLocalIdentity(actor);
  assertString(messageId, "messageId");
  const conversation = await getConversationForMember({ chatId, identityId: identity.id, appName: actor.appName });
  const message = await ChatMessage.findOne({ where: { id: messageId, conversationId: conversation.id, senderIdentityId: identity.id } });
  if (!message) throw new ChatServiceError("Message not found or cannot be deleted", { status: 404, code: "CHAT_MESSAGE_NOT_DELETABLE" });
  await message.update({ deletedAt: new Date(), deletedByIdentityId: identity.id, text: "" });
  const payload = toMessage(await getMessageWithReactions(message.id));
  await notifyConversationMessageUpdate({ appName: actor.appName, conversationId: conversation.id, message: payload, participantUserIds: await getConversationParticipantUserIds(conversation.id) });
  await writeChatAuditLog({ appName: actor.appName, appUserId: actor.appUserId, provider, action: "delete_message", targetChatId: conversation.id, metadata: { messageId: message.id } });
  return payload;
};

export const pinChatMessage = async ({ actor, chatId, messageId, pinned = true }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  assertString(messageId, "messageId");

  const message = await ChatMessage.findOne({
    where: {
      id: messageId,
      conversationId: conversation.id,
    },
  });

  if (!message) {
    throw new ChatServiceError("Message not found", {
      status: 404,
      code: "CHAT_MESSAGE_NOT_FOUND",
    });
  }

  const shouldPin = Boolean(pinned);
  await message.update({
    metadata: {
      ...(message.metadata || {}),
      pinned: shouldPin,
      pinnedAt: shouldPin ? new Date().toISOString() : null,
      pinnedBy: shouldPin
        ? {
            id: String(identity.appUserId || ""),
            name: identity.displayName || actor.displayName || actor.email || "Chat user",
            email: identity.email || actor.email || "",
          }
        : null,
    },
  });

  const fullMessage = await ChatMessage.findByPk(message.id, {
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
  });
  const messagePayload = toMessage(fullMessage);
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
  });
  const participantUserIds = participants
    .map((participant) => participant.identity?.appUserId)
    .filter(Boolean);

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: shouldPin ? "pin_message" : "unpin_message",
    targetChatId: conversation.id,
    metadata: { messageId: message.id },
  });

  await notifyConversationMessageUpdate({
    appName: actor.appName,
    conversationId: conversation.id,
    message: messagePayload,
    participantUserIds,
  });

  return messagePayload;
};

export const sendDirectChatMessage = async ({ actor, userId, text, replyTo, metadata }) => {
  const conversation = await createDirectConversation({ actor, userId });
  const sentMessage = await sendChatMessage({
    actor,
    chatId: conversation.id,
    text,
    replyTo,
    metadata,
  });
  const messages = await getChatMessages({
    actor,
    chatId: conversation.id,
  });

  return {
    chat: conversation,
    chatId: conversation.id,
    sentMessage,
    messages,
    indexedInHistory: true,
  };
};

export const sendMultiUserMessage = async ({ actor, userIds, text }) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ChatServiceError("userIds must be a non-empty array", {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }

  const results = [];

  for (const userId of userIds) {
    try {
      const result = await sendDirectChatMessage({
        actor,
        userId: String(userId),
        text,
      });
      results.push({ userId, success: true, result });
    } catch (error) {
      results.push({
        userId,
        success: false,
        message: error.message,
        code: error.code,
      });
    }
  }

  return results;
};

export const sendBroadcastMessage = async ({ actor, text, search }) => {
  const users = await getChatUsers({
    actor,
    query: {
      search,
      excludeSelf: true,
      limit: 100,
    },
  });
  const userIds = users.map((user) => user.id);

  return sendMultiUserMessage({ actor, userIds, text });
};


