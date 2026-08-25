import { Op } from "sequelize";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatUserPresence from "../modules/chatUserPresence.module.js";
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
} from "../realtime/chatSocket.js";
import {
  provider,
  defaultAppName,
  readStreamToBuffer,
  normalizeLimit,
  toUser,
  assertString,
  ensureLocalIdentity,
  ChatServiceError,
} from "../helpers/chat.helpers.js";

export const getChatActor = (req) => ({
  // appName is retained as the persistence scope for backwards compatibility.
  // It now always comes from the signed tenant claim, never a client header.
  appName: req.auth?.tenantId || normalizeAppName(defaultAppName),
  tenantId: req.auth?.tenantId || normalizeAppName(defaultAppName),
  sourceApp: req.auth?.sourceApp || normalizeAppName(defaultAppName),
  authToken: req.authToken || null,
  appUserId:
    req.auth?.subject ||
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.user?.appUserId ||
    req.user?.sub ||
    null,
  appUserEmail:
    req.user?.email ||
    req.user?.userEmail ||
    req.user?.user_email ||
    req.user?.mail ||
    req.user?.preferred_username ||
    null,
  displayName:
    req.user?.name ||
    req.user?.displayName ||
    req.user?.display_name ||
    req.user?.username ||
    null,
  role: req.user?.role || null,
  roles: Array.isArray(req.user?.roles)
    ? req.user.roles
    : req.user?.role
      ? [req.user.role]
      : [],
  permissions: Array.isArray(req.user?.permissions) ? req.user.permissions : [],
  presence: req.user?.presence || req.user?.status || null,
});

export const updateChatPresence = async ({ actor, presence }) => {
  const identity = await ensureLocalIdentity(actor);
  const normalizedPresence = String(presence || "")
    .trim()
    .toLowerCase();
  const allowedPresence = ["online", "away", "busy", "dnd", "offline"];

  if (!allowedPresence.includes(normalizedPresence)) {
    throw new ChatServiceError(
      "presence must be online, away, busy, dnd, or offline",
      {
        status: 400,
        code: "CHAT_INVALID_PRESENCE",
      },
    );
  }

  await identity.update({
    metadata: {
      ...(identity.metadata || {}),
      presence: normalizedPresence,
      status: normalizedPresence,
    },
  });
  if (actor.appUserId) {
    const now = new Date();
    await ChatUserPresence.upsert({
      userId: String(actor.appUserId),
      sessionId: "primary",
      presence: normalizedPresence,
      lastSeenAt: now,
      connectedAt: normalizedPresence === "online" ? now : null,
      disconnectedAt: normalizedPresence === "offline" ? now : null,
    });
  }

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
  const localUsers = await listChatDirectoryUsers({
    search,
    limit: Math.max(limit, 100),
    excludeUserId: query.excludeSelf ? identity.appUserId : null,
  });
  // The local chat user table is authoritative for local accounts. Merge it
  // with the host directory so users created by the admin panel are available
  // in group creation even when the host directory returns only a subset.
  const isLocalChat =
    actor.sourceApp === "chat_system" ||
    actor.appName === "chat_system" ||
    actor.appName === "local";
  const directoryUsers = isLocalChat
    ? localUsers
    : [...(providerUsers || []), ...localUsers];
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
    order: [
      ["providerDisplayName", "ASC"],
      ["appUserEmail", "ASC"],
    ],
  });
  const usersByKey = new Map();

  for (const user of directoryUsers.filter(
    (user) =>
      !query.excludeSelf || String(user.id) !== String(identity.appUserId),
  )) {
    usersByKey.set(String(user.id), user);
  }

  for (const knownIdentity of knownIdentities) {
    const key = String(knownIdentity.appUserId);
    usersByKey.set(key, toUser(knownIdentity, usersByKey.get(key) || null));
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
      [Op.or]: [{ appUserId: String(userId) }, { id: String(userId) }],
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

export {
  getChatUserSettings,
  updateChatUserSettings,
  createChatRole,
  listChatRoles,
} from "./chatUser.services.js";
