import { Op } from "sequelize";
import crypto from "crypto";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatMessage from "../modules/chatMessage.module.js";
import ChatMessageReaction from "../modules/chatMessageReaction.module.js";
import ChatAuditLog from "../modules/chatAuditLog.module.js";
import ChatGroup from "../modules/chatGroup.module.js";
import ChatChannel from "../modules/chatChannel.module.js";
import { writeChatAuditLog } from "./chatAudit.services.js";
import {
  getChatDirectoryUserById,
  listChatDirectoryUsers,
  updateChatUserAvatar,
} from "./chatUser.services.js";
import {
  fetchApplicationUsers,
  findApplicationUser,
  normalizeAppName,
} from "./applicationDirectory.services.js";
import { normalizeAvatarUrl } from "./chatAvatar.services.js";
import {
  broadcastAvatarUpdate,
  broadcastPresenceUpdate,
  notifyConversationMessage,
} from "../realtime/chatSocket.js";

const provider = "local_chat";
const defaultAppName = "chat_system";

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
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
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
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
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

  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_BUCKET_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const expectedHost = bucket && region ? `${bucket}.s3.${region}.amazonaws.com` : "";

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
  const region = process.env.AWS_BUCKET_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_BUCKET_NAME;

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
  ].map((part) => encodeURIComponent(part)).join("/");
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

const normalizeMessagePage = (messages, limit) => {
  const hasMore = messages.length > limit;
  const pageMessages = hasMore ? messages.slice(0, limit) : messages;
  const orderedMessages = [...pageMessages].reverse();

  return {
    data: orderedMessages.map(toMessage),
    messages: orderedMessages.map(toMessage),
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore ? String(pageMessages[pageMessages.length - 1].id) : null,
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
  const avatarUrl = signS3UrlIfNeeded(chatUser?.avatarUrl || metadata.avatarUrl || null);

  return {
    id: String(identity.appUserId),
    user_id: String(identity.appUserId),
    chatIdentityId: identity.id,
    email: identity.appUserEmail,
    email_id: identity.appUserEmail,
    name: identity.providerDisplayName || identity.appUserEmail || String(identity.appUserId),
    display_name: identity.providerDisplayName || identity.appUserEmail || String(identity.appUserId),
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
  text: message.text,
  replyTo: message.replyToMessageId ? String(message.replyToMessageId) : null,
  sender: message.sender ? toUser(message.sender) : null,
  senderId: message.sender ? String(message.sender.appUserId) : String(message.senderIdentityId),
  reactions: (message.reactions || []).map(toReaction),
  metadata: message.metadata,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

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

  if (currentParticipant?.lastReadAt) {
    unreadWhere.createdAt = { [Op.gt]: currentParticipant.lastReadAt };
  }

  const unreadCount = await ChatMessage.count({ where: unreadWhere });

  return {
    id: String(conversation.id),
    chat_id: String(conversation.id),
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
    participants: participants.map((participant) => toUser(participant.identity)),
    participantCount: participants.length,
    unreadCount,
    lastMessage: lastMessage ? toMessage(lastMessage) : null,
    lastMessageAt: conversation.lastMessageAt,
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
  id: String(group.id),
  name: group.name,
  description: group.description,
  conversationId: String(group.conversationId),
  ownerUserId: String(group.ownerUserId),
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});

export const getChatActor = (req) => ({
  appName: normalizeAppName(req.headers["x-chat-app-name"] || defaultAppName),
  authToken: req.authToken || null,
  appUserId:
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.body?.appUserId ||
    null,
  appUserEmail: req.user?.email || req.body?.appUserEmail || null,
  displayName:
    req.user?.name ||
    req.user?.displayName ||
    req.user?.username ||
    req.body?.displayName ||
    null,
  role: req.user?.role || req.body?.role || null,
  presence: req.user?.presence || req.user?.status || req.body?.presence || null,
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
    (await findApplicationUser({ actor, userId: actor.appUserId }).catch(() => null)) ||
    (await getChatDirectoryUserById(actor.appUserId));

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
    appUserEmail: chatUser?.email || actor.appUserEmail || identity.appUserEmail,
    providerUserId: String(actor.appUserId),
    providerEmail: chatUser?.email || actor.appUserEmail || identity.providerEmail,
    providerDisplayName:
      chatUser?.display_name ||
      chatUser?.name ||
      actor.displayName ||
      actor.appUserEmail ||
      identity.providerDisplayName,
    metadata: {
      ...(identity.metadata || {}),
      ...(chatUser?.avatarUrl ? { avatarUrl: chatUser.avatarUrl } : {}),
      ...(actor.presence ? { presence: actor.presence, status: actor.presence } : {}),
    },
  });

  return identity;
};

export const updateChatPresence = async ({ actor, presence }) => {
  const identity = await ensureLocalIdentity(actor);
  const normalizedPresence = String(presence || "").trim().toLowerCase();
  const allowedPresence = ["online", "away", "busy", "offline"];

  if (!allowedPresence.includes(normalizedPresence)) {
    throw new ChatServiceError("presence must be online, away, busy, or offline", {
      status: 400,
      code: "CHAT_INVALID_PRESENCE",
    });
  }

  await identity.update({
    metadata: {
      ...(identity.metadata || {}),
      presence: normalizedPresence,
      status: normalizedPresence,
    },
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "update_presence",
    metadata: { presence: normalizedPresence },
  });

  const chatUser = await getChatDirectoryUserById(actor.appUserId);
  const user = toUser(identity, chatUser);

  broadcastPresenceUpdate({
    appName: actor.appName,
    userId: String(actor.appUserId),
    presence: normalizedPresence,
    user,
  });

  return {
    connected: true,
    provider,
    appName: actor.appName,
    appUserId: String(actor.appUserId),
    user,
  };
};

const findOrCreateUserIdentity = async ({ actor, appName, userId, email, displayName }) => {
  assertString(String(userId || ""), "userId");
  const resolvedAppName = normalizeAppName(appName || actor?.appName || defaultAppName);
  const chatUser =
    (actor ? await findApplicationUser({ actor, userId }).catch(() => null) : null) ||
    (await getChatDirectoryUserById(userId));

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
  const participant = await ChatConversationParticipant.findOne({
    where: {
      conversationId: chatId,
      chatIdentityId: identityId,
    },
    include: [
      {
        model: ChatConversation,
        as: "conversation",
        where: appName ? { appName: normalizeAppName(appName) } : undefined,
      },
    ],
  });

  if (!participant?.conversation) {
    throw new ChatServiceError("Conversation not found", {
      status: 404,
      code: "CHAT_CONVERSATION_NOT_FOUND",
    });
  }

  return participant.conversation;
};

const getParticipantForMember = async ({ chatId, identityId, appName }) => {
  const participant = await ChatConversationParticipant.findOne({
    where: {
      conversationId: chatId,
      chatIdentityId: identityId,
    },
    include: [
      {
        model: ChatConversation,
        as: "conversation",
        where: appName ? { appName: normalizeAppName(appName) } : undefined,
      },
    ],
  });

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
    throw new ChatServiceError("Only group owners can manage this conversation", {
      status: 403,
      code: "CHAT_GROUP_OWNER_REQUIRED",
    });
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

export const getChatConnectionStatus = async ({ actor }) => {
  const identity = await ensureLocalIdentity(actor);
  const chatUser = await getChatDirectoryUserById(actor.appUserId);

  return {
    connected: true,
    provider,
    appName: actor.appName,
    appUserId: String(actor.appUserId),
    user: toUser(identity, chatUser),
    scopes: "local",
  };
};

export const getChatUsers = async ({ actor, query = {} }) => {
  const identity = await ensureLocalIdentity(actor);
  const limit = normalizeLimit(query.limit, 50, 100);
  const search = String(query.search || "").trim();
  const providerUsers = await fetchApplicationUsers({
    actor,
    query: {
      search,
      limit,
      excludeSelf: query.excludeSelf,
    },
  }).catch((error) => {
    throw new ChatServiceError(error.message, {
      status: error.status || 502,
      code: error.code || "CHAT_APP_DIRECTORY_FAILED",
      details: error.details,
    });
  });
  const directoryUsers =
    providerUsers ||
    (await listChatDirectoryUsers({
      search,
      limit,
      excludeUserId: query.excludeSelf ? identity.appUserId : null,
    }));
  const identityWhere = {
    appName: actor.appName,
    provider,
  };

  if (query.excludeSelf) {
    identityWhere.appUserId = { [Op.ne]: String(identity.appUserId) };
  }

  if (search) {
    identityWhere[Op.or] = [
      { appUserEmail: { [Op.like]: `%${search}%` } },
      { providerEmail: { [Op.like]: `%${search}%` } },
      { providerDisplayName: { [Op.like]: `%${search}%` } },
      { appUserId: { [Op.like]: `%${search}%` } },
    ];
  }

  const knownIdentities = await ChatIdentity.findAll({
    where: identityWhere,
    limit,
    order: [["providerDisplayName", "ASC"], ["appUserEmail", "ASC"]],
  });
  const usersByKey = new Map();

  for (const user of directoryUsers) {
    usersByKey.set(String(user.id), user);
  }

  for (const knownIdentity of knownIdentities) {
    const key = String(knownIdentity.appUserId);

    if (!usersByKey.has(key)) {
      usersByKey.set(key, toUser(knownIdentity));
    }
  }

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "list_users",
    metadata: { search: search || null },
  });

  return [...usersByKey.values()].slice(0, limit);
};

export const getChatUserProfile = async ({ actor, userId }) => {
  await ensureLocalIdentity(actor);
  assertString(userId, "userId");
  const chatUser =
    (await findApplicationUser({ actor, userId }).catch(() => null)) ||
    (await getChatDirectoryUserById(userId));

  if (chatUser) {
    return chatUser;
  }

  const identity = await ChatIdentity.findOne({
    where: {
      appName: actor.appName,
      provider,
      [Op.or]: [{ appUserId: String(userId) }, { id: Number(userId) || 0 }],
    },
  });

  if (!identity) {
    throw new ChatServiceError("Chat user not found", {
      status: 404,
      code: "CHAT_USER_NOT_FOUND",
    });
  }

  return toUser(identity);
};

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
    order: [[{ model: ChatConversation, as: "conversation" }, "lastMessageAt", "DESC"]],
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

export const addGroupConversationMembers = async ({ actor, chatId, userIds = [] }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError("Members can only be added to group conversations", {
      status: 400,
      code: "CHAT_NOT_GROUP_CONVERSATION",
    });
  }

  assertGroupOwner(participant);
  assertArray(userIds, "userIds");

  const uniqueUserIds = [...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean))];

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
    addedMembers: members.map(({ identity: memberIdentity }) => toUser(memberIdentity)),
  };
};

export const removeGroupConversationMember = async ({ actor, chatId, userId }) => {
  const identity = await ensureLocalIdentity(actor);
  const participant = await getParticipantForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const conversation = participant.conversation;

  if (conversation.type !== "group") {
    throw new ChatServiceError("Members can only be removed from group conversations", {
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

  if (!targetIdentity) {
    throw new ChatServiceError("Chat user not found", {
      status: 404,
      code: "CHAT_USER_NOT_FOUND",
    });
  }

  if (targetIdentity.id === identity.id) {
    throw new ChatServiceError("Group owners should leave the conversation instead", {
      status: 400,
      code: "CHAT_INVALID_INPUT",
    });
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

export const markChatConversationRead = async ({ actor, chatId }) => {
  const identity = await ensureLocalIdentity(actor);
  await getConversationForMember({ chatId, identityId: identity.id, appName: actor.appName });

  await ChatConversationParticipant.update(
    { lastReadAt: new Date() },
    {
      where: {
        conversationId: chatId,
        chatIdentityId: identity.id,
      },
    },
  );

  return {
    chatId: String(chatId),
    unreadCount: 0,
    readAt: new Date().toISOString(),
  };
};

export const searchChatMessages = async ({ actor, query = {} }) => {
  const identity = await ensureLocalIdentity(actor);
  const search = String(query.search || query.q || "").trim();
  const limit = normalizeLimit(query.limit, 25, 50);

  assertString(search, "search");

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
    attributes: ["conversationId"],
  });
  const conversationIds = memberships.map((membership) => membership.conversationId);

  if (conversationIds.length === 0) {
    return { data: [], messages: [], pagination: { limit, hasMore: false } };
  }

  const messages = await ChatMessage.findAll({
    where: {
      conversationId: { [Op.in]: conversationIds },
      text: { [Op.like]: `%${search}%` },
    },
    include: [
      { model: ChatIdentity, as: "sender" },
      {
        model: ChatMessageReaction,
        as: "reactions",
        include: [{ model: ChatIdentity, as: "identity" }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "search_messages",
    metadata: { search },
  });

  const data = messages.map(toMessage);

  return {
    data,
    messages: data,
    pagination: {
      limit,
      hasMore: data.length === limit,
    },
  };
};

export const getChatAuditLogs = async ({ actor, query = {} }) => {
  await ensureLocalIdentity(actor);
  const limit = normalizeLimit(query.limit, 50, 100);
  const where = {
    appName: actor.appName,
  };

  if (query.action) where.action = String(query.action);
  if (query.userId) where.appUserId = String(query.userId);
  if (query.chatId) where.targetChatId = String(query.chatId);

  const logs = await ChatAuditLog.findAll({
    where,
    limit,
    order: [["createdAt", "DESC"]],
  });

  return {
    data: logs,
    pagination: {
      limit,
      hasMore: logs.length === limit,
    },
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

export const createGroupConversation = async ({ actor, title, userIds = [] }) => {
  const actorIdentity = await ensureLocalIdentity(actor);
  const uniqueUserIds = [...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean))];

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
  });
  const group = await ChatGroup.create({
    appName: actor.appName,
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

  const uniqueUserIds = [...new Set(userIds.map((userId) => String(userId).trim()).filter(Boolean))];

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

export const getChatMessages = async ({ actor, chatId, query = {} }) => {
  const identity = await ensureLocalIdentity(actor);
  await getConversationForMember({ chatId, identityId: identity.id, appName: actor.appName });

  const limit = normalizeLimit(query.limit, 50, 100);
  const where = { conversationId: chatId };

  if (query.before) {
    const cursorMessage = await ChatMessage.findOne({
      where: {
        id: query.before,
        conversationId: chatId,
      },
    });

    if (cursorMessage) {
      where.createdAt = { [Op.lt]: cursorMessage.createdAt };
    }
  }

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

  await ChatConversationParticipant.update(
    { lastReadAt: new Date() },
    {
      where: {
        conversationId: chatId,
        chatIdentityId: identity.id,
      },
    },
  );

  return {
    chatId: String(chatId),
    ...normalizeMessagePage(messages, limit),
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

export const sendDirectChatMessage = async ({ actor, userId, text, metadata }) => {
  const conversation = await createDirectConversation({ actor, userId });
  const sentMessage = await sendChatMessage({
    actor,
    chatId: conversation.id,
    text,
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

export const sendChatFile = async ({
  actor,
  chatId,
  stream,
  contentType,
  contentLength,
  fileName,
}) => {
  const buffer = await readStreamToBuffer(stream);
  const file = await uploadToS3({
    buffer,
    fileName,
    contentType,
    actor,
    chatId,
  });

  return sendChatMessage({
    actor,
    chatId,
    text: file.name,
    replyTo: null,
    metadata: {
      type: "file",
      contentType: file.contentType,
      contentLength: Number(contentLength) || file.size,
      file,
    },
  });
};

export const addChatReaction = async ({ actor, chatId, messageId, emoji }) => {
  const identity = await ensureLocalIdentity(actor);
  await getConversationForMember({ chatId, identityId: identity.id, appName: actor.appName });
  assertString(messageId, "messageId");
  assertString(emoji, "emoji");

  const message = await ChatMessage.findOne({
    where: {
      id: messageId,
      conversationId: chatId,
    },
  });

  if (!message) {
    throw new ChatServiceError("Message not found", {
      status: 404,
      code: "CHAT_MESSAGE_NOT_FOUND",
    });
  }

  const [reaction] = await ChatMessageReaction.findOrCreate({
    where: {
      messageId: message.id,
      chatIdentityId: identity.id,
      emoji,
    },
  });

  return toReaction({ ...reaction.get({ plain: true }), identity });
};

export const removeChatReaction = async ({ actor, chatId, messageId, emoji }) => {
  const identity = await ensureLocalIdentity(actor);
  await getConversationForMember({ chatId, identityId: identity.id, appName: actor.appName });
  assertString(messageId, "messageId");
  assertString(emoji, "emoji");

  await ChatMessageReaction.destroy({
    where: {
      messageId,
      chatIdentityId: identity.id,
      emoji,
    },
  });

  return {
    removed: true,
    messageId: String(messageId),
    emoji,
  };
};

export const updateChatAvatar = async ({
  actor,
  avatarUrl,
  stream,
  contentType,
  fileName,
}) => {
  const identity = await ensureLocalIdentity(actor);
  let normalizedAvatarUrl;

  if (stream) {
    const normalizedContentType = String(contentType || "").toLowerCase();

    if (!normalizedContentType.startsWith("image/")) {
      throw new ChatServiceError("Profile picture must be an image", {
        status: 400,
        code: "CHAT_INVALID_AVATAR",
      });
    }

    const buffer = await readStreamToBuffer(stream, 5 * 1024 * 1024);
    const avatar = await uploadToS3({
      buffer,
      fileName: fileName || "profile-picture",
      contentType: normalizedContentType,
      actor,
      chatId: actor.appUserId,
      prefix: "chat-avatars",
    });

    normalizedAvatarUrl = normalizeAvatarUrl(avatar.publicUrl || avatar.url);
  } else {
    normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
  }

  await updateChatUserAvatar({
    userId: actor.appUserId,
    avatarUrl: normalizedAvatarUrl,
    email: actor.appUserEmail,
    displayName: actor.displayName,
    username: actor.appUserEmail || actor.appUserId,
  });

  await identity.update({
    metadata: {
      ...(identity.metadata || {}),
      avatarUrl: normalizedAvatarUrl,
    },
  });

  const chatUser = await getChatDirectoryUserById(actor.appUserId);
  const user = toUser(identity, chatUser);

  broadcastAvatarUpdate({
    appName: actor.appName,
    userId: String(actor.appUserId),
    avatarUrl: user.avatarUrl,
    user,
  });

  await writeChatAuditLog({
    appName: actor.appName,
    appUserId: actor.appUserId,
    provider,
    action: "update_avatar",
    metadata: { avatarUpdated: true },
  });

  return {
    connected: true,
    provider,
    appName: actor.appName,
    appUserId: String(actor.appUserId),
    user,
  };
};

export { ChatServiceError };
