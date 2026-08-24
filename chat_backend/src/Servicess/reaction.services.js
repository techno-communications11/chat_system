import ChatMessage from "../modules/chatMessage.module.js";
import ChatMessageReaction from "../modules/chatMessageReaction.module.js";
import {
  notifyConversationMessageUpdate,
  notifyMessageReaction,
} from "../realtime/chatSocket.js";
import {
  ensureLocalIdentity,
  getConversationForMember,
  assertString,
  toUser,
  toReaction,
  toMessage,
  getMessageWithReactions,
  getConversationParticipantUserIds,
  ChatServiceError,
} from "../helpers/chat.helpers.js";

export const addChatReaction = async ({ actor, chatId, messageId, emoji }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversationId = conversation.id;
  assertString(messageId, "messageId");
  assertString(emoji, "emoji");

  const message = await ChatMessage.findOne({
    where: {
      id: messageId,
      conversationId,
    },
  });

  if (!message) {
    throw new ChatServiceError("Message not found", {
      status: 404,
      code: "CHAT_MESSAGE_NOT_FOUND",
    });
  }

  const [reaction, created] = await ChatMessageReaction.findOrCreate({
    where: {
      messageId: message.id,
      chatIdentityId: identity.id,
      emoji,
    },
  });

  const fullMessage = await getMessageWithReactions(message.id);
  const messagePayload = toMessage(fullMessage);
  const participantUserIds = await getConversationParticipantUserIds(
    conversation.id,
  );

  await notifyConversationMessageUpdate({
    appName: actor.appName,
    conversationId: conversation.id,
    message: messagePayload,
    participantUserIds,
  });

  const messageSenderUserId = String(fullMessage?.sender?.appUserId || "");
  if (
    created &&
    messageSenderUserId &&
    messageSenderUserId !== String(identity.appUserId)
  ) {
    notifyMessageReaction({
      appName: actor.appName,
      conversationId: conversation.id,
      targetUserId: messageSenderUserId,
      reaction: {
        ...toReaction({ ...reaction.get({ plain: true }), identity }),
        actor: toUser(identity),
      },
      message: messagePayload,
    });
  }

  return toReaction({ ...reaction.get({ plain: true }), identity });
};

export const removeChatReaction = async ({
  actor,
  chatId,
  messageId,
  emoji,
}) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  assertString(messageId, "messageId");
  assertString(emoji, "emoji");

  await ChatMessageReaction.destroy({
    where: {
      messageId,
      chatIdentityId: identity.id,
      emoji,
    },
  });

  const fullMessage = await getMessageWithReactions(messageId);
  if (fullMessage) {
    const messagePayload = toMessage(fullMessage);
    const participantUserIds = await getConversationParticipantUserIds(
      conversation.id,
    );

    await notifyConversationMessageUpdate({
      appName: actor.appName,
      conversationId: conversation.id,
      message: messagePayload,
      participantUserIds,
    });
  }

  return {
    removed: true,
    messageId: String(messageId),
    emoji,
  };
};
