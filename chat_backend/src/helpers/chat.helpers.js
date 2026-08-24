import { Op } from "sequelize";
import crypto from "crypto";
import { chatConfig } from "../config/chat.config.js";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatMessage from "../modules/chatMessage.module.js";
import ChatMessageReaction from "../modules/chatMessageReaction.module.js";
import { getChatDirectoryUserById } from "../Servicess/chatUser.services.js";
import {
  findApplicationUser,
  normalizeAppName,
} from "../Servicess/applicationDirectory.services.js";
const { provider, defaultAppName } = chatConfig;

class ChatServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ChatServiceError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

const readStreamToBuffer = async (stream, maxBytes = 25 * 1024 * 1024) => {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw new ChatServiceError("File is too large. Maximum size is 25MB.", {
        status: 413,
        code: "CHAT_FILE_TOO_LARGE",
      });
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
};

const sanitizeFileName = (value) => {
  const decoded = decodeURIComponent(String(value || "document").trim());
  const name = decoded.split(/[\\/]/).pop() || "document";
  return name.replace(/[^\w.\- ()]/g, "_").slice(0, 160) || "document";
};

const hmac = (key, value, encoding) =>
  crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);

const hash = (value, encoding = "hex") =>
  crypto.createHash("sha256").update(value).digest(encoding);

const normalizeCallType = (value) => {
  const type = String(value || "audio").toLowerCase();
  return type === "video" ? "video" : "audio";
};

const getCallDurationSeconds = (call) => {
  const startedAt = new Date(call?.startedAt).getTime();
  const endedAt = new Date(call?.endedAt).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt))
    return undefined;
  return Math.max(0, Math.round((endedAt - startedAt) / 1000));
};

const getCallHistoryText = (call, actorName) => {
  if (call.status === "ringing") return "Started a chat call";
  if (call.status === "accepted") return `${actorName} accepted the chat call`;
  if (call.status === "declined") return `${actorName} declined the chat call`;
  if (call.status === "cancelled") return "Cancelled the chat call";
  if (call.status === "missed")
    return "Missed chat call - recipient unavailable";
  if (call.status === "ended") {
    const seconds = getCallDurationSeconds(call);
    const duration =
      seconds >= 60
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : `${seconds || 0}s`;
    return `Ended the chat call - ${duration}`;
  }
  return `Chat call ${call.status}`;
};

const getSignatureKey = (secretKey, dateStamp, region, service) => {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
};

const createS3DownloadUrl = ({
  bucket,
  region,
  accessKeyId,
  secretAccessKey,
  objectKey,
  expiresSeconds = 604800,
}) => {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`,
    )
    .join("&");
  const canonicalRequest = [
    "GET",
    `/${objectKey}`,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
  const signature = hmac(signingKey, stringToSign, "hex");

  return `https://${host}/${objectKey}?${canonicalQuery}&X-Amz-Signature=${signature}`;
};

const createS3UploadUrl = ({
  bucket,
  region,
  accessKeyId,
  secretAccessKey,
  objectKey,
  expiresSeconds = 300,
}) => {
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`,
    )
    .join("&");
  const canonicalRequest = [
    "PUT",
    `/${objectKey}`,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
  const signature = hmac(signingKey, stringToSign, "hex");

  return `https://${host}/${objectKey}?${canonicalQuery}&X-Amz-Signature=${signature}`;
};

const signS3UrlIfNeeded = (value) => {
  const rawUrl = String(value || "").trim();

  if (!rawUrl || /^data:/i.test(rawUrl) || /^blob:/i.test(rawUrl)) {
    return rawUrl || null;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const { bucket, region, accessKeyId, secretAccessKey } = chatConfig.s3;
  const expectedHost =
    bucket && region ? `${bucket}.s3.${region}.amazonaws.com` : "";

  if (
    !bucket ||
    !region ||
    !accessKeyId ||
    !secretAccessKey ||
    url.hostname !== expectedHost
  ) {
    return rawUrl;
  }

  const objectKey = url.pathname.replace(/^\/+/, "");
  if (!objectKey) return rawUrl;

  return createS3DownloadUrl({
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    objectKey,
  });
};

const uploadToS3 = async ({
  buffer,
  fileName,
  contentType,
  actor,
  chatId,
  prefix = "chat-documents",
}) => {
  const { bucket, region, accessKeyId, secretAccessKey } = chatConfig.s3;

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new ChatServiceError("AWS S3 upload is not configured", {
      status: 500,
      code: "CHAT_S3_NOT_CONFIGURED",
    });
  }

  const safeName = sanitizeFileName(fileName);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const objectKey = [
    prefix,
    actor.appName,
    String(chatId),
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
  ]
    .map((part) => encodeURIComponent(part))
    .join("/");
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/${objectKey}`;
  const url = `https://${host}${canonicalUri}`;
  const uploadUrl = createS3UploadUrl({
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    objectKey,
  });
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new ChatServiceError("Could not upload file to S3", {
      status: 502,
      code: "CHAT_S3_UPLOAD_FAILED",
      details: await response.text().catch(() => null),
    });
  }

  return {
    bucket,
    key: decodeURIComponent(objectKey),
    name: safeName,
    size: buffer.length,
    contentType: contentType || "application/octet-stream",
    url: createS3DownloadUrl({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      objectKey,
    }),
    publicUrl: url,
  };
};

const assertString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ChatServiceError(`${fieldName} is required`, {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }
};

const assertArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new ChatServiceError(`${fieldName} must be an array`, {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
  }
};

const normalizeLimit = (value, fallback = 50, max = 100) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;

  return Math.min(Math.floor(numericValue), max);
};

const normalizeMessagePage = (
  messages,
  limit,
  serializeMessage = toMessage,
) => {
  const hasMore = messages.length > limit;
  const pageMessages = hasMore ? messages.slice(0, limit) : messages;
  const orderedMessages = [...pageMessages].reverse();

  return {
    data: orderedMessages.map(serializeMessage),
    messages: orderedMessages.map(serializeMessage),
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore
        ? String(pageMessages[pageMessages.length - 1].id)
        : null,
    },
  };
};

const sortDirectParticipants = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort();

const getDirectKey = (appName, firstUserId, secondUserId) => {
  const [first, second] = sortDirectParticipants(firstUserId, secondUserId);
  return `${appName}:${first}:${second}`;
};

const toUser = (identity, chatUser = null) => {
  const metadata = identity.metadata || {};
  const presence = metadata.presence || metadata.status || null;
  const avatarUrl = signS3UrlIfNeeded(
    chatUser?.avatarUrl || metadata.avatarUrl || null,
  );
  const name =
    identity.providerDisplayName ||
    chatUser?.display_name ||
    chatUser?.name ||
    identity.appUserEmail ||
    String(identity.appUserId);
  const profile = {
    id: String(identity.appUserId),
    email: identity.appUserEmail || chatUser?.email || null,
    username: chatUser?.username || metadata.username || null,
    name,
    displayName: name,
    avatarUrl,
    status: presence || chatUser?.status || null,
    presence: presence || chatUser?.presence || null,
    lastSeenAt: chatUser?.lastSeenAt || null,
    role: chatUser?.role || null,
    roles: Array.isArray(chatUser?.roles) ? chatUser.roles : [],
    metadata: chatUser?.metadata || metadata,
  };

  return {
    id: String(identity.appUserId),
    user_id: String(identity.appUserId),
    chatIdentityId: identity.id,
    email: identity.appUserEmail,
    email_id: identity.appUserEmail,
    name,
    display_name: name,
    avatarUrl,
    imageUrl: avatarUrl,
    provider,
    presence,
    status: presence,
    metadata: {
      ...metadata,
      avatarUrl,
    },
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    profile,
  };
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toReaction = (reaction) => ({
  id: reaction.id,
  emoji: reaction.emoji,
  userId: String(reaction.identity?.appUserId || reaction.chatIdentityId),
  chatIdentityId: reaction.chatIdentityId,
  createdAt: reaction.createdAt,
});

const toMessage = (message) => ({
  id: String(message.id),
  message_id: String(message.id),
  chatId: String(message.conversationId),
  chat_id: String(message.conversationId),
  text: message.deletedAt ? "This message was deleted" : message.text,
  replyTo: message.replyToMessageId ? String(message.replyToMessageId) : null,
  sender: message.sender ? toUser(message.sender) : null,
  senderId: message.sender
    ? String(message.sender.appUserId)
    : String(message.senderIdentityId),
  reactions: (message.reactions || []).map(toReaction),
  metadata: {
    ...(message.metadata || {}),
    ...(message.deletedAt ? { deleted: true } : {}),
  },
  deletedAt: message.deletedAt || null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getMessageWithReactions = (messageId) =>
  ChatMessage.findByPk(messageId, {
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
  });

const getConversationParticipantUserIds = async (conversationId) => {
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId },
    include: [{ model: ChatIdentity, as: "identity" }],
  });

  return participants
    .map((participant) => participant.identity?.appUserId)
    .filter(Boolean);
};

const toConversation = async (conversation, currentIdentityId) => {
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
    order: [["id", "ASC"]],
  });
  const lastMessage = await ChatMessage.findOne({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "sender" }],
    order: [["createdAt", "DESC"]],
  });
  const otherParticipant = participants.find(
    (participant) => participant.chatIdentityId !== currentIdentityId,
  );
  const currentParticipant = participants.find(
    (participant) => participant.chatIdentityId === currentIdentityId,
  );
  const unreadWhere = {
    conversationId: conversation.id,
    senderIdentityId: { [Op.ne]: currentIdentityId },
  };

  const unreadAfter = [
    currentParticipant?.lastReadAt,
    currentParticipant?.clearedAt,
  ]
    .filter(Boolean)
    .reduce(
      (latest, timestamp) =>
        !latest || new Date(timestamp).getTime() > new Date(latest).getTime()
          ? timestamp
          : latest,
      null,
    );

  if (unreadAfter) {
    unreadWhere.createdAt = { [Op.gt]: unreadAfter };
  }

  const visibleLastMessage =
    currentParticipant?.clearedAt &&
    lastMessage &&
    new Date(lastMessage.createdAt).getTime() <=
      new Date(currentParticipant.clearedAt).getTime()
      ? null
      : lastMessage;

  const unreadCount = await ChatMessage.count({ where: unreadWhere });

  return {
    id: String(conversation.publicId || conversation.id),
    chat_id: String(conversation.publicId || conversation.id),
    type: conversation.type,
    isDirect: conversation.type === "direct",
    isGroup: conversation.type === "group",
    isChannel: Boolean(conversation.metadata?.channelId),
    title:
      conversation.title ||
      otherParticipant?.identity?.providerDisplayName ||
      otherParticipant?.identity?.appUserEmail ||
      otherParticipant?.identity?.appUserId ||
      "Chat",
    participants: participants.map((participant) =>
      toUser(participant.identity),
    ),
    participantCount: participants.length,
    unreadCount,
    lastMessage: visibleLastMessage ? toMessage(visibleLastMessage) : null,
    lastMessageAt: visibleLastMessage ? conversation.lastMessageAt : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const toChannel = (channel) => ({
  id: String(channel.id),
  name: channel.name,
  slug: channel.slug,
  description: channel.description,
  visibility: channel.visibility,
  conversationId: String(channel.conversationId),
  ownerUserId: String(channel.ownerUserId),
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt,
});

const toGroup = (group) => ({
  id: String(group.publicId || group.id),
  name: group.name,
  description: group.description,
  conversationId: String(group.conversation?.publicId || group.conversationId),
  ownerUserId: String(group.ownerUserId),
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});
const assertActor = (actor) => {
  if (!actor.appUserId) {
    throw new ChatServiceError(
      "Current application user is missing from the auth token. Log in again.",
      {
        status: 401,
        code: "CHAT_APP_USER_MISSING",
      },
    );
  }
};

const ensureLocalIdentity = async (actor) => {
  assertActor(actor);
  const chatUser =
    (await findApplicationUser({ actor, userId: actor.appUserId }).catch(
      () => null,
    )) || (await getChatDirectoryUserById(actor.appUserId));

  const [identity] = await ChatIdentity.findOrCreate({
    where: {
      appName: actor.appName,
      appUserId: String(actor.appUserId),
      provider,
    },
    defaults: {
      appName: actor.appName,
      appUserId: String(actor.appUserId),
      appUserEmail: chatUser?.email || actor.appUserEmail,
      provider,
      providerUserId: String(actor.appUserId),
      providerEmail: chatUser?.email || actor.appUserEmail,
      providerDisplayName:
        chatUser?.display_name ||
        chatUser?.name ||
        actor.displayName ||
        actor.appUserEmail,
      metadata: actor.presence ? { presence: actor.presence } : null,
    },
  });

  await identity.update({
    appUserEmail:
      chatUser?.email || actor.appUserEmail || identity.appUserEmail,
    providerUserId: String(actor.appUserId),
    providerEmail:
      chatUser?.email || actor.appUserEmail || identity.providerEmail,
    providerDisplayName:
      chatUser?.display_name ||
      chatUser?.name ||
      actor.displayName ||
      actor.appUserEmail ||
      identity.providerDisplayName,
    metadata: {
      ...(identity.metadata || {}),
      ...(chatUser?.avatarUrl ? { avatarUrl: chatUser.avatarUrl } : {}),
      ...(actor.presence
        ? { presence: actor.presence, status: actor.presence }
        : {}),
    },
  });

  return identity;
};

const findOrCreateUserIdentity = async ({
  actor,
  appName,
  userId,
  email,
  displayName,
}) => {
  assertString(String(userId || ""), "userId");
  const resolvedAppName = normalizeAppName(
    appName || actor?.appName || defaultAppName,
  );
  const chatUser =
    (actor
      ? await findApplicationUser({ actor, userId }).catch(() => null)
      : null) || (await getChatDirectoryUserById(userId));

  const [identity] = await ChatIdentity.findOrCreate({
    where: {
      appName: resolvedAppName,
      appUserId: String(userId),
      provider,
    },
    defaults: {
      appName: resolvedAppName,
      appUserId: String(userId),
      appUserEmail: chatUser?.email || email || null,
      provider,
      providerUserId: String(userId),
      providerEmail: chatUser?.email || email || null,
      providerDisplayName:
        chatUser?.display_name ||
        chatUser?.name ||
        displayName ||
        email ||
        String(userId),
    },
  });

  await identity.update({
    appUserEmail: chatUser?.email || email || identity.appUserEmail,
    providerEmail: chatUser?.email || email || identity.providerEmail,
    providerDisplayName:
      chatUser?.display_name ||
      chatUser?.name ||
      displayName ||
      email ||
      identity.providerDisplayName,
  });

  return identity;
};

const getConversationForMember = async ({ chatId, identityId, appName }) => {
  const requestedId = String(chatId || "");
  const conversationWhere = {
    ...(appName ? { appName: normalizeAppName(appName) } : {}),
    ...(requestedId.includes("-")
      ? { publicId: requestedId }
      : { id: requestedId }),
  };
  const conversation = await ChatConversation.findOne({
    where: conversationWhere,
  });
  const participant =
    conversation &&
    (await ChatConversationParticipant.findOne({
      where: { conversationId: conversation.id, chatIdentityId: identityId },
      include: [{ model: ChatConversation, as: "conversation" }],
    }));

  if (!participant?.conversation) {
    throw new ChatServiceError("Conversation not found", {
      status: 404,
      code: "CHAT_CONVERSATION_NOT_FOUND",
    });
  }

  return participant.conversation;
};

const getParticipantForMember = async ({ chatId, identityId, appName }) => {
  const requestedId = String(chatId || "");
  const conversationWhere = {
    ...(appName ? { appName: normalizeAppName(appName) } : {}),
    ...(requestedId.includes("-")
      ? { publicId: requestedId }
      : { id: requestedId }),
  };
  const conversation = await ChatConversation.findOne({
    where: conversationWhere,
  });
  const participant =
    conversation &&
    (await ChatConversationParticipant.findOne({
      where: { conversationId: conversation.id, chatIdentityId: identityId },
      include: [{ model: ChatConversation, as: "conversation" }],
    }));

  if (!participant?.conversation) {
    throw new ChatServiceError("Conversation not found", {
      status: 404,
      code: "CHAT_CONVERSATION_NOT_FOUND",
    });
  }

  return participant;
};

const assertGroupOwner = (participant) => {
  const role = String(participant.role || "").toLowerCase();

  if (!["owner", "admin"].includes(role)) {
    throw new ChatServiceError(
      "Only group owners can manage this conversation",
      {
        status: 403,
        code: "CHAT_GROUP_OWNER_REQUIRED",
      },
    );
  }
};

const ensureDirectConversation = async ({ actorIdentity, targetIdentity }) => {
  if (actorIdentity.id === targetIdentity.id) {
    throw new ChatServiceError("You cannot start a direct chat with yourself", {
      status: 400,
      code: "CHAT_INVALID_RECIPIENT",
    });
  }

  const directKey = getDirectKey(
    actorIdentity.appName,
    actorIdentity.appUserId,
    targetIdentity.appUserId,
  );

  const [conversation] = await ChatConversation.findOrCreate({
    where: { directKey },
    defaults: {
      appName: actorIdentity.appName,
      type: "direct",
      directKey,
      publicId: crypto.randomUUID(),
    },
  });

  await ChatConversationParticipant.findOrCreate({
    where: {
      conversationId: conversation.id,
      chatIdentityId: actorIdentity.id,
    },
  });
  await ChatConversationParticipant.findOrCreate({
    where: {
      conversationId: conversation.id,
      chatIdentityId: targetIdentity.id,
    },
  });

  return conversation;
};

export {
  provider,
  defaultAppName,
  readStreamToBuffer,
  sanitizeFileName,
  hmac,
  hash,
  normalizeCallType,
  getCallDurationSeconds,
  getCallHistoryText,
  getSignatureKey,
  createS3DownloadUrl,
  createS3UploadUrl,
  signS3UrlIfNeeded,
  uploadToS3,
  assertString,
  assertArray,
  normalizeLimit,
  normalizeMessagePage,
  sortDirectParticipants,
  getDirectKey,
  toUser,
  slugify,
  toReaction,
  toMessage,
  getMessageWithReactions,
  getConversationParticipantUserIds,
  toConversation,
  toChannel,
  toGroup,
  assertActor,
  ensureLocalIdentity,
  findOrCreateUserIdentity,
  getConversationForMember,
  getParticipantForMember,
  assertGroupOwner,
  ensureDirectConversation,
  ChatServiceError,
};
