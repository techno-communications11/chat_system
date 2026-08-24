import crypto from "crypto";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatGroup from "../modules/chatGroup.module.js";
import ChatChannel from "../modules/chatChannel.module.js";
import { writeChatAuditLog } from "./chatAudit.services.js";
import { notifyConversationRead } from "../realtime/chatSocket.js";
import {
  provider,
  toConversation,
  toChannel,
  toGroup,
  assertString,
  ensureLocalIdentity,
  findOrCreateUserIdentity,
  getConversationForMember,
  getParticipantForMember,
  assertGroupOwner,
  ensureDirectConversation,
  ChatServiceError,
} from "../helpers/chat.helpers.js";

export const getChatConversations = async ({ actor }) => {
  const identity = await ensureLocalIdentity(actor);
  const participants = await ChatConversationParticipant.findAll({
    where: { chatIdentityId: identity.id },
    include: [
      {
        model: ChatConversation,
        as: "conversation",
        where: { appName: actor.appName },
      },
    ],
    order: [
      [
        { model: ChatConversation, as: "conversation" },
        "lastMessageAt",
        "DESC",
      ],
    ],
  });

  return Promise.all(
    participants
      .map((participant) => participant.conversation)
      .filter(Boolean)
      .map((conversation) => toConversation(conversation, identity.id)),
  );
};

export const updateGroupConversation = async ({ actor, chatId, title }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError("Only group conversations can be updated", {
      status: 400,
      code: "CHAT_NOT_GROUP_CONVERSATION",
    });
  }

  assertGroupOwner(participant);
  assertString(title, "title");

  await conversation.update({ title: title.trim() });
  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "update_group_conversation",
    targetChatId: conversation.id,
    metadata: { title: conversation.title },
  });

  return toConversation(conversation, identity.id);
};

export const addGroupConversationMembers = async ({
  actor,
  chatId,
  userIds = [],
}) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError(
      "Members can only be added to group conversations",
      {
        status: 400,
        code: "CHAT_NOT_GROUP_CONVERSATION",
      },
    );
  }

  assertGroupOwner(participant);
  assertArray(userIds, "userIds");

  const uniqueUserIds = [
    ...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean)),
  ];

  if (uniqueUserIds.length === 0) {
    throw new ChatServiceError("userIds must include at least one member", {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }

  const members = [];

  for (const userId of uniqueUserIds) {
    const memberIdentity = await findOrCreateUserIdentity({
      actor,
      appName: actor.appName,
      userId,
    });

    const [member] = await ChatConversationParticipant.findOrCreate({
      where: {
        conversationId: conversation.id,
        chatIdentityId: memberIdentity.id,
      },
      defaults: { role: "member" },
    });

    members.push({ member, identity: memberIdentity });
  }

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "add_group_members",
    targetChatId: conversation.id,
    metadata: { userIds: uniqueUserIds },
  });

  return {
    conversation: await toConversation(conversation, identity.id),
    addedMembers: members.map(({ identity: memberIdentity }) =>
      toUser(memberIdentity),
    ),
  };
};

export const removeGroupConversationMember = async ({
  actor,
  chatId,
  userId,
}) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError(
      "Members can only be removed from group conversations",
      {
        status: 400,
        code: "CHAT_NOT_GROUP_CONVERSATION",
      },
    );
  }

  assertGroupOwner(participant);
  assertString(userId, "userId");

  const targetIdentity = await ChatIdentity.findOne({
    where: {
      appName: actor.appName,
      provider,
      appUserId: String(userId),
    },
  });

  if (!targetIdentity) {
    throw new ChatServiceError("Chat user not found", {
      status: 404,
      code: "CHAT_USER_NOT_FOUND",
    });
  }

  if (targetIdentity.id === identity.id) {
    throw new ChatServiceError(
      "Group owners should leave the conversation instead",
      {
        status: 400,
        code: "CHAT_INVALID_INPUT",
      },
    );
  }

  const removed = await ChatConversationParticipant.destroy({
    where: {
      conversationId: conversation.id,
      chatIdentityId: targetIdentity.id,
    },
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "remove_group_member",
    targetUserId: userId,
    targetChatId: conversation.id,
  });

  return {
    removed: removed > 0,
    userId: String(userId),
    conversation: await toConversation(conversation, identity.id),
  };
};

export const leaveChatConversation = async ({ actor, chatId }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError("Direct conversations cannot be left", {
      status: 400,
      code: "CHAT_DIRECT_LEAVE_UNSUPPORTED",
    });
  }

  const memberCount = await ChatConversationParticipant.count({
    where: { conversationId: conversation.id },
  });

  if (String(participant.role).toLowerCase() === "owner" && memberCount > 1) {
    throw new ChatServiceError("Transfer ownership before leaving this group", {
      status: 400,
      code: "CHAT_TRANSFER_OWNER_REQUIRED",
    });
  }

  await participant.destroy();
  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "leave_conversation",
    targetChatId: conversation.id,
  });

  return {
    left: true,
    chatId: String(chatId),
  };
};

export const transferGroupOwnership = async ({ actor, chatId, userId }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError("Ownership can only be transferred for groups", {
      status: 400,
      code: "CHAT_NOT_GROUP_CONVERSATION",
    });
  }

  assertGroupOwner(participant);
  assertString(userId, "userId");

  const targetIdentity = await ChatIdentity.findOne({
    where: {
      appName: actor.appName,
      provider,
      appUserId: String(userId),
    },
  });
  const targetParticipant =
    targetIdentity &&
    (await ChatConversationParticipant.findOne({
      where: {
        conversationId: conversation.id,
        chatIdentityId: targetIdentity.id,
      },
    }));

  if (!targetIdentity || !targetParticipant) {
    throw new ChatServiceError("The new owner must be a group member", {
      status: 400,
      code: "CHAT_OWNER_MUST_BE_MEMBER",
    });
  }

  await ChatConversationParticipant.update(
    { role: "member" },
    { where: { conversationId: conversation.id, chatIdentityId: identity.id } },
  );
  await targetParticipant.update({ role: "owner" });

  const group = await ChatGroup.findOne({
    where: { conversationId: conversation.id },
  });
  if (group) await group.update({ ownerUserId: String(userId) });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "transfer_group_ownership",
    targetUserId: String(userId),
    targetChatId: conversation.id,
  });

  return {
    transferred: true,
    ownerUserId: String(userId),
    conversation: await toConversation(conversation, identity.id),
  };
};

export const markChatConversationRead = async ({ actor, chatId }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversationId = conversation.id;
  const readAt = new Date();

  await ChatConversationParticipant.update(
    { lastReadAt: readAt },
    {
      where: {
        conversationId,
        chatIdentityId: identity.id,
      },
    },
  );

  const readParticipants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [
      { model: ChatIdentity, as: "identity", attributes: ["appUserId"] },
    ],
    attributes: ["lastReadAt"],
  });
  const participantUserIds = readParticipants
    .map((participant) => participant.identity?.appUserId)
    .filter(Boolean);

  await notifyConversationRead({
    appName: actor.appName,
    conversationId: conversation.id,
    participantUserIds,
    userId: identity.appUserId,
    readAt: readAt.toISOString(),
    isDirect: conversation.type === "direct",
    readStates: readParticipants.map((participant) => ({
      userId: String(participant.identity?.appUserId || ""),
      readAt:
        participant.lastReadAt?.toISOString?.() ||
        participant.lastReadAt ||
        null,
    })),
  });

  return {
    chatId: String(chatId),
    unreadCount: 0,
    readAt: readAt.toISOString(),
  };
};

export const clearChatHistory = async ({ actor, chatId }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const clearedAt = new Date();

  await participant.update({ clearedAt, lastReadAt: clearedAt });
  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "clear_chat_history",
    targetChatId: String(chatId),
    metadata: { clearedAt: clearedAt.toISOString(), scope: "participant" },
  });

  return {
    chatId: String(chatId),
    clearedAt: clearedAt.toISOString(),
    scope: "participant",
  };
};

export const createDirectConversation = async ({ actor, userId }) => {
  const actorIdentity = await ensureLocalIdentity(actor);
  const targetIdentity = await findOrCreateUserIdentity({
    actor,
    appName: actor.appName,
    userId,
  });
  const conversation = await ensureDirectConversation({
    actorIdentity,
    targetIdentity,
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "open_direct_conversation",
    targetUserId: userId,
    targetChatId: conversation.id,
  });

  return toConversation(conversation, actorIdentity.id);
};

export const createGroupConversation = async ({
  actor,
  title,
  userIds = [],
}) => {
  const actorIdentity = await ensureLocalIdentity(actor);
  const uniqueUserIds = [
    ...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean)),
  ];

  if (uniqueUserIds.length === 0) {
    throw new ChatServiceError("userIds must include at least one member", {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }

  const conversation = await ChatConversation.create({
    appName: actor.appName,
    type: "group",
    title: String(title || "Group chat").trim(),
    publicId: crypto.randomUUID(),
  });
  const group = await ChatGroup.create({
    appName: actor.appName,
    publicId: crypto.randomUUID(),
    name: conversation.title,
    description: null,
    ownerUserId: String(actorIdentity.appUserId),
    conversationId: conversation.id,
  });
  await conversation.update({
    metadata: { groupId: group.id },
  });

  await ChatConversationParticipant.create({
    conversationId: conversation.id,
    chatIdentityId: actorIdentity.id,
    role: "owner",
  });

  for (const userId of uniqueUserIds) {
    if (String(userId) === String(actorIdentity.appUserId)) continue;

    const identity = await findOrCreateUserIdentity({
      actor,
      appName: actor.appName,
      userId,
    });

    await ChatConversationParticipant.findOrCreate({
      where: {
        conversationId: conversation.id,
        chatIdentityId: identity.id,
      },
      defaults: { role: "member" },
    });
  }

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "create_group_conversation",
    targetChatId: conversation.id,
    metadata: { title: conversation.title, userIds: uniqueUserIds },
  });

  return toConversation(conversation, actorIdentity.id);
};

export const listChatGroups = async ({ actor }) => {
  await ensureLocalIdentity(actor);

  const groups = await ChatGroup.findAll({
    where: { appName: actor.appName },
    include: [{ model: ChatConversation, as: "conversation" }],
    order: [["updatedAt", "DESC"]],
  });

  return groups.map(toGroup);
};

export const createChatChannel = async ({
  actor,
  name,
  description,
  visibility = "public",
  userIds = [],
}) => {
  const actorIdentity = await ensureLocalIdentity(actor);
  assertString(name, "name");

  const slug = slugify(name);

  if (!slug) {
    throw new ChatServiceError("Channel name must contain letters or numbers", {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }

  const existing = await ChatChannel.findOne({
    where: { appName: actor.appName, slug },
  });

  if (existing) {
    throw new ChatServiceError("Channel already exists", {
      status: 409,
      code: "CHAT_CHANNEL_EXISTS",
    });
  }

  const conversation = await ChatConversation.create({
    appName: actor.appName,
    type: "group",
    title: `#${slug}`,
    publicId: crypto.randomUUID(),
  });
  const channel = await ChatChannel.create({
    appName: actor.appName,
    name: name.trim(),
    slug,
    description: description || null,
    visibility: visibility === "private" ? "private" : "public",
    ownerUserId: String(actorIdentity.appUserId),
    conversationId: conversation.id,
  });

  await conversation.update({
    metadata: { channelId: channel.id },
  });
  await ChatConversationParticipant.create({
    conversationId: conversation.id,
    chatIdentityId: actorIdentity.id,
    role: "owner",
  });

  const uniqueUserIds = [
    ...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean)),
  ];

  for (const userId of uniqueUserIds) {
    if (String(userId) === String(actorIdentity.appUserId)) continue;

    const identity = await findOrCreateUserIdentity({
      actor,
      appName: actor.appName,
      userId,
    });

    await ChatConversationParticipant.findOrCreate({
      where: {
        conversationId: conversation.id,
        chatIdentityId: identity.id,
      },
      defaults: { role: "member" },
    });
  }

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "create_channel",
    targetChatId: conversation.id,
    metadata: { channelId: channel.id, slug },
  });

  return {
    channel: toChannel(channel),
    conversation: await toConversation(conversation, actorIdentity.id),
  };
};

export const listChatChannels = async ({ actor }) => {
  const identity = await ensureLocalIdentity(actor);
  const channels = await ChatChannel.findAll({
    where: { appName: actor.appName },
    include: [{ model: ChatConversation, as: "conversation" }],
    order: [["name", "ASC"]],
  });

  const data = [];

  for (const channel of channels) {
    const membership = await ChatConversationParticipant.findOne({
      where: {
        conversationId: channel.conversationId,
        chatIdentityId: identity.id,
      },
    });

    if (channel.visibility === "public" || membership) {
      data.push({
        ...toChannel(channel),
        joined: Boolean(membership),
      });
    }
  }

  return data;
};

export const joinChatChannel = async ({ actor, channelId }) => {
  const identity = await ensureLocalIdentity(actor);
  const channel = await ChatChannel.findOne({
    where: {
      id: channelId,
      appName: actor.appName,
    },
  });

  if (!channel) {
    throw new ChatServiceError("Channel not found", {
      status: 404,
      code: "CHAT_CHANNEL_NOT_FOUND",
    });
  }

  if (channel.visibility === "private") {
    throw new ChatServiceError("Private channels require an invitation", {
      status: 403,
      code: "CHAT_PRIVATE_CHANNEL",
    });
  }

  await ChatConversationParticipant.findOrCreate({
    where: {
      conversationId: channel.conversationId,
      chatIdentityId: identity.id,
    },
    defaults: { role: "member" },
  });

  return {
    channel: toChannel(channel),
    conversation: await toConversation(
      await ChatConversation.findByPk(channel.conversationId),
      identity.id,
    ),
  };
};
