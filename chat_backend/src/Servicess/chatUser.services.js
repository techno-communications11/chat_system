import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import serverConfig from "../config/server.config.js";
import ChatUser from "../modules/chatUser.module.js";
import ChatUserSettings from "../modules/chatUserSettings.module.js";
import ChatBlockedUser from "../modules/chatBlockedUser.module.js";
import ChatMutedConversation from "../modules/chatMutedConversation.module.js";
import ChatUserPresence from "../modules/chatUserPresence.module.js";
import ChatMarket from "../modules/chatMarket.module.js";
import ChatRole from "../modules/chatRole.module.js";
import { normalizeAppName } from "./applicationDirectory.services.js";
import { chatConfig } from "../config/chat.config.js";

const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex"),
) => {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 120000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, passwordHash) => {
  const [salt, storedHash] = String(passwordHash || "").split(":");
  if (!salt || !storedHash) return false;

  const candidate = hashPassword(password, salt).split(":")[1];
  const candidateBuffer = Buffer.from(candidate, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  return (
    candidateBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, storedBuffer)
  );
};

const assertPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 256
  ) {
    const error = new Error("password must be between 8 and 256 characters");
    error.status = 400;
    error.code = "CHAT_INVALID_PASSWORD";
    throw error;
  }
};

const normalizeRoleName = (roleName) =>
  String(roleName || "member")
    .trim()
    .toLowerCase();

const toPublicUser = (user) => {
  const plainUser = user.get ? user.get({ plain: true }) : user;
  const roles = plainUser.roles || [];
  const roleNames = roles.map((role) => role.name);
  const presenceSession = (plainUser.presenceSessions || [])
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
  const manager = plainUser.manager || null;
  const market = plainUser.marketRelation || null;
  const presence = presenceSession?.presence || "offline";
  const lastSeenAt = presenceSession?.lastSeenAt || null;
  const managerName = manager?.displayName || null;
  const marketName = market?.name || null;
  const profile = {
    id: String(plainUser.id),
    email: plainUser.email,
    username: plainUser.username,
    name: plainUser.displayName,
    displayName: plainUser.displayName,
    designation: plainUser.designation,
    managerUserId: plainUser.managerUserId ? String(plainUser.managerUserId) : null,
    managerName,
    marketId: plainUser.marketId || null,
    market: marketName,
    backoffice: plainUser.backoffice || null,
    marketBackoffice: plainUser.marketBackoffice || plainUser.backoffice || marketName || null,
    avatarUrl: plainUser.avatarUrl,
    status: plainUser.status,
    presence,
    lastSeenAt,
    role: roleNames[0] || "member",
    roles: roleNames,
  };

  return {
    id: String(plainUser.id),
    user_id: String(plainUser.id),
    email: plainUser.email,
    email_id: plainUser.email,
    username: plainUser.username,
    name: plainUser.displayName,
    display_name: plainUser.displayName,
    designation: plainUser.designation,
    managerUserId: plainUser.managerUserId ? String(plainUser.managerUserId) : null,
    managerName,
    marketId: plainUser.marketId || null,
    market: marketName,
    backoffice: plainUser.backoffice || null,
    marketBackoffice: plainUser.marketBackoffice || plainUser.backoffice || marketName || null,
    avatarUrl: plainUser.avatarUrl,
    status: plainUser.status,
    presence,
    lastSeenAt,
    role: roleNames[0] || "member",
    roles: roleNames,
    provider: "local_chat",
    createdAt: plainUser.createdAt,
    updatedAt: plainUser.updatedAt,
    profile,
  };
};

const issueToken = (user, { appName } = {}) => {
  const publicUser = toPublicUser(user);
  const appClaim = appName || chatConfig.localAuth.appName;
  const sourceApp = appClaim ? normalizeAppName(appClaim) : null;
  const appClaims = sourceApp ? { app: sourceApp, apps: [sourceApp] } : {};

  return jwt.sign(
    {
      id: publicUser.id,
      userId: publicUser.id,
      email: publicUser.email,
      username: publicUser.username,
      name: publicUser.name,
      displayName: publicUser.display_name,
      role: publicUser.role,
      roles: publicUser.roles,
      tenant_id: chatConfig.localAuth.tenantId,
      ...appClaims,
      jti: crypto.randomUUID(),
    },
    serverConfig.secretKey,
    {
      expiresIn: chatConfig.localAuth.jwtExpiresIn,
      issuer: chatConfig.localAuth.jwtIssuer,
      audience: chatConfig.localAuth.jwtAudience,
      subject: publicUser.id,
    },
  );
};

const includeRoles = [
  { model: ChatRole, as: "roles", through: { attributes: [] } },
  { model: ChatUser, as: "manager", attributes: ["id", "displayName", "email", "username"] },
  { model: ChatMarket, as: "marketRelation", attributes: ["id", "name", "active"] },
  { model: ChatUserPresence, as: "presenceSessions" },
];

export const listChatDirectoryUsers = async ({
  search,
  limit = 50,
  excludeUserId,
} = {}) => {
  const where = { status: "active" };

  if (search) {
    where[Op.or] = [
      { email: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { displayName: { [Op.like]: `%${search}%` } },
    ];
  }

  if (excludeUserId) {
    where.id = { [Op.ne]: String(excludeUserId) };
  }

  const users = await ChatUser.findAll({
    where,
    include: includeRoles,
    limit,
    order: [
      ["displayName", "ASC"],
      ["username", "ASC"],
    ],
  });

  return users.map(toPublicUser);
};

export const getChatDirectoryUserById = async (userId) => {
  if (!userId) return null;

  const user = await ChatUser.findOne({
    where: { id: String(userId) },
    include: includeRoles,
  });

  return user ? toPublicUser(user) : null;
};

const getOrCreateChatUserSettings = async (user) => {
  const [settings] = await ChatUserSettings.findOrCreate({
    where: { userId: user.id },
    defaults: {
      userId: user.id,
      themeMode: "light",
      desktopNotifications: false,
      enterToSend: false,
    },
  });
  return settings;
};

const refreshTokenSecret = () => process.env.CHAT_REFRESH_SECRET || serverConfig.secretKey;

const issueRefreshToken = (user) =>
  jwt.sign(
    { sub: String(user.id), type: "refresh", jti: crypto.randomUUID() },
    refreshTokenSecret(),
    {
      expiresIn: process.env.CHAT_REFRESH_TOKEN_EXPIRES_IN || "7d",
      issuer: chatConfig.localAuth.jwtIssuer,
      audience: `${chatConfig.localAuth.jwtAudience}-refresh`,
    },
  );

const tokenPair = (user, { appName } = {}) => {
  const accessToken = issueToken(user, { appName });
  return {
  token: accessToken,
  accessToken,
  refreshToken: issueRefreshToken(user),
  tokenType: "Bearer",
  accessTokenExpiresIn: chatConfig.localAuth.jwtExpiresIn,
  refreshTokenExpiresIn: process.env.CHAT_REFRESH_TOKEN_EXPIRES_IN || "7d",
  };
};

const getBlockedUserIds = async (userId) => {
  const rows = await ChatBlockedUser.findAll({
    where: { userId },
    attributes: ["blockedUserId"],
  });
  return rows.map((row) => String(row.blockedUserId));
};

const getMutedChatIds = async (userId) => {
  const rows = await ChatMutedConversation.findAll({
    where: { userId },
    attributes: ["conversationId"],
  });
  return rows.map((row) => String(row.conversationId));
};

const serializeChatUserSettings = async (settings) => ({
  themeMode: settings.themeMode === "dark" ? "dark" : "light",
  desktopNotifications: settings.desktopNotifications === true,
  enterToSend: settings.enterToSend === true,
  mutedChatIds: await getMutedChatIds(settings.userId),
  blockedUserIds: await getBlockedUserIds(settings.userId),
});

export const getChatUserSettings = async ({ userId }) => {
  const user = await ChatUser.findByPk(String(userId));
  if (!user) return serializeChatUserSettings({ userId: String(userId) });
  return serializeChatUserSettings(await getOrCreateChatUserSettings(user));
};

export const updateChatUserSettings = async ({ userId, settings = {} }) => {
  const user = await ChatUser.findByPk(String(userId));
  if (!user) {
    const error = new Error("Chat user not found");
    error.status = 404;
    error.code = "CHAT_USER_NOT_FOUND";
    throw error;
  }

  const userSettings = await getOrCreateChatUserSettings(user);
  const updates = {};
  if (typeof settings.desktopNotifications === "boolean") {
    updates.desktopNotifications = settings.desktopNotifications;
  }
  if (settings.themeMode === "dark" || settings.themeMode === "light") {
    updates.themeMode = settings.themeMode;
  }
  if (typeof settings.enterToSend === "boolean") {
    updates.enterToSend = settings.enterToSend;
  }
  await userSettings.update(updates);

  if (Array.isArray(settings.mutedChatIds)) {
    const mutedChatIds = [
      ...new Set(settings.mutedChatIds.map((value) => String(value).trim()).filter(Boolean)),
    ];
    await ChatMutedConversation.destroy({ where: { userId: user.id } });
    if (mutedChatIds.length > 0) {
      await ChatMutedConversation.bulkCreate(
        mutedChatIds.map((conversationId) => ({
          userId: user.id,
          conversationId,
        })),
      );
    }
  }

  if (Array.isArray(settings.blockedUserIds)) {
    const blockedUserIds = [
      ...new Set(settings.blockedUserIds.map((value) => String(value).trim()).filter(Boolean)),
    ];
    await ChatBlockedUser.destroy({ where: { userId: user.id } });
    if (blockedUserIds.length > 0) {
      await ChatBlockedUser.bulkCreate(
        blockedUserIds.map((blockedUserId) => ({ userId: user.id, blockedUserId })),
      );
    }
  }

  return serializeChatUserSettings({
    ...userSettings.toJSON(),
    userId: user.id,
  });
};

export const registerChatUser = async ({
  email,
  username,
  displayName,
  password,
  roleName = "member",
}) => {
  if (!email || !username || !displayName || !password) {
    const error = new Error(
      "email, username, displayName, and password are required",
    );
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  assertPassword(password);

  const role = await ChatRole.findOne({
    where: { name: normalizeRoleName(roleName) },
  });

  if (!role) {
    const error = new Error("Role not found");
    error.status = 404;
    error.code = "CHAT_ROLE_NOT_FOUND";
    throw error;
  }

  const user = await ChatUser.create({
    email: String(email).trim().toLowerCase(),
    username: String(username).trim().toLowerCase(),
    displayName: String(displayName).trim(),
    passwordHash: hashPassword(password),
  });

  await user.addRole(role);

  const fullUser = await ChatUser.findByPk(user.id, { include: includeRoles });

  return {
    user: toPublicUser(fullUser),
    ...tokenPair(fullUser),
  };
};

export const loginChatUser = async ({ login, password, appName }) => {
  if (!login || !password) {
    const error = new Error("login and password are required");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  assertPassword(password);

  const user = await ChatUser.findOne({
    where: {
      [Op.or]: [
        { email: String(login).trim().toLowerCase() },
        { username: String(login).trim().toLowerCase() },
      ],
    },
    include: includeRoles,
  });

  if (
    !user ||
    !verifyPassword(password, user.passwordHash) ||
    user.status !== "active"
  ) {
    const error = new Error("Invalid chat login");
    error.status = 401;
    error.code = "CHAT_LOGIN_FAILED";
    throw error;
  }

  const now = new Date();
  await ChatUserPresence.upsert({
    userId: user.id,
    sessionId: "primary",
    presence: "online",
    lastSeenAt: now,
    connectedAt: now,
    disconnectedAt: null,
  });
  const fullUser = await ChatUser.findByPk(user.id, { include: includeRoles });

  return {
    user: toPublicUser(fullUser),
    ...tokenPair(fullUser, { appName }),
  };
};

export const refreshChatUser = async ({ refreshToken }) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, refreshTokenSecret(), {
      issuer: chatConfig.localAuth.jwtIssuer,
      audience: `${chatConfig.localAuth.jwtAudience}-refresh`,
    });
  } catch {
    const error = new Error("Invalid or expired refresh token");
    error.status = 401;
    error.code = "CHAT_REFRESH_TOKEN_INVALID";
    throw error;
  }
  if (payload.type !== "refresh" || !payload.sub) {
    const error = new Error("Invalid refresh token");
    error.status = 401;
    error.code = "CHAT_REFRESH_TOKEN_INVALID";
    throw error;
  }
  const user = await ChatUser.findByPk(String(payload.sub), { include: includeRoles });
  if (!user || user.status !== "active") {
    const error = new Error("User is not active");
    error.status = 401;
    error.code = "CHAT_REFRESH_USER_INACTIVE";
    throw error;
  }
  return { user: toPublicUser(user), ...tokenPair(user) };
};

export const listChatRoles = async () =>
  ChatRole.findAll({ order: [["name", "ASC"]] });

export const createChatRole = async ({ name, description, permissions }) => {
  if (!name) {
    const error = new Error("name is required");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }

  const [role] = await ChatRole.findOrCreate({
    where: { name: normalizeRoleName(name) },
    defaults: {
      name: normalizeRoleName(name),
      description: description || null,
      permissions: permissions || [],
    },
  });

  return role;
};

const adminUserInclude = [
  ...includeRoles,
  { model: ChatUserSettings, as: "settings", attributes: ["themeMode", "desktopNotifications", "enterToSend"] },
];

const normalizeAdminUserInput = (input = {}) => ({
  email: String(input.email || "").trim().toLowerCase(),
  username: String(input.username || "").trim().toLowerCase(),
  displayName: String(input.displayName || input.name || "").trim(),
  password: input.password == null ? "" : String(input.password),
  roleName: normalizeRoleName(input.roleName || input.role || "member"),
  designation: input.designation ? String(input.designation).trim() : null,
  manager: input.manager ?? input.managerName ?? input.managerUserId ?? null,
  market: input.market ?? input.marketName ?? input.marketId ?? null,
  backoffice: input.backoffice ? String(input.backoffice).trim() : null,
  marketBackoffice: input.marketBackoffice ? String(input.marketBackoffice).trim() : null,
});

const resolveUserManager = async (value, userId) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const text = String(value).trim();
  const manager = await ChatUser.findOne({
    where: {
      [Op.or]: [{ id: text }, { email: text.toLowerCase() }, { username: text.toLowerCase() }, { displayName: text }],
    },
  });
  if (!manager) throw Object.assign(new Error(`Manager not found: ${text}`), { status: 400, code: "CHAT_MANAGER_NOT_FOUND" });
  if (String(manager.id) === String(userId)) throw Object.assign(new Error("A user cannot be their own manager"), { status: 400, code: "CHAT_INVALID_MANAGER" });
  return manager.id;
};

const resolveMarket = async (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const text = String(value).trim();
  const existingById = await ChatMarket.findByPk(text);
  if (existingById) return existingById.id;
  const [market] = await ChatMarket.findOrCreate({
    where: { name: text },
    defaults: { name: text },
  });
  return market.id;
};

const createAdminUserRecord = async (input) => {
  const normalized = normalizeAdminUserInput(input);
  if (!normalized.email || !normalized.username || !normalized.displayName || !normalized.password) {
    const error = new Error("email, username, displayName, and password are required");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  assertPassword(normalized.password);

  const managerUserId = await resolveUserManager(normalized.manager);
  const marketId = await resolveMarket(normalized.market);

  const role = await ChatRole.findOne({ where: { name: normalized.roleName } });
  if (!role) {
    const error = new Error(`Role not found: ${normalized.roleName}`);
    error.status = 404;
    error.code = "CHAT_ROLE_NOT_FOUND";
    throw error;
  }

  const user = await ChatUser.create({
    email: normalized.email,
    username: normalized.username,
    displayName: normalized.displayName,
    designation: normalized.designation,
    managerUserId,
    marketId,
    backoffice: normalized.backoffice,
    marketBackoffice: normalized.marketBackoffice,
    passwordHash: hashPassword(normalized.password),
  });
  await user.addRole(role);
  return ChatUser.findByPk(user.id, { include: adminUserInclude });
};

export const listAdminUsers = async ({ search = "", status = "all", role = "all", page = 1, limit = 25 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const where = {};
  const normalizedSearch = String(search).trim();
  if (normalizedSearch) {
    where[Op.or] = [
      { email: { [Op.like]: `%${normalizedSearch}%` } },
      { username: { [Op.like]: `%${normalizedSearch}%` } },
      { displayName: { [Op.like]: `%${normalizedSearch}%` } },
    ];
  }
  if (["active", "disabled"].includes(String(status))) where.status = status;
  const include = [...adminUserInclude];
  if (role && role !== "all") {
    include[0] = { ...include[0], where: { name: String(role).toLowerCase() }, required: true };
  }
  const result = await ChatUser.findAndCountAll({
    where,
    include,
    distinct: true,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    order: [["createdAt", "DESC"]],
  });
  return {
    users: result.rows.map(toPublicUser),
    pagination: { page: safePage, limit: safeLimit, total: result.count, pages: Math.ceil(result.count / safeLimit) },
  };
};

export const getAdminUser = async (userId) => {
  const user = await ChatUser.findByPk(String(userId), { include: adminUserInclude });
  if (!user) {
    const error = new Error("Chat user not found");
    error.status = 404;
    error.code = "CHAT_USER_NOT_FOUND";
    throw error;
  }
  const reports = await ChatUser.findAll({
    where: { managerUserId: user.id },
    attributes: ["id", "email", "username", "displayName", "status"],
    order: [["displayName", "ASC"]],
  });
  return { ...toPublicUser(user), settings: user.settings || null, reports };
};

export const createAdminUser = async (input) => toPublicUser(await createAdminUserRecord(input));

export const bulkCreateAdminUsers = async (users = []) => {
  if (!Array.isArray(users) || users.length === 0) {
    const error = new Error("users must be a non-empty array");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  if (users.length > 500) {
    const error = new Error("Bulk upload is limited to 500 users");
    error.status = 400;
    error.code = "CHAT_BULK_LIMIT_EXCEEDED";
    throw error;
  }
  const created = [];
  const failures = [];
  for (let index = 0; index < users.length; index += 1) {
    try {
      created.push(toPublicUser(await createAdminUserRecord(users[index])));
    } catch (error) {
      failures.push({ row: index + 1, email: users[index]?.email || "", message: error.message });
    }
  }
  return { created, failures, createdCount: created.length, failedCount: failures.length };
};

export const updateAdminUser = async ({ userId, status, roleName, email, username, displayName, designation, manager, managerName, managerUserId, market, marketName, marketId, backoffice, marketBackoffice }) => {
  const user = await ChatUser.findByPk(String(userId), { include: includeRoles });
  if (!user) {
    const error = new Error("Chat user not found");
    error.status = 404;
    error.code = "CHAT_USER_NOT_FOUND";
    throw error;
  }
  const profileUpdates = {};
  if (email !== undefined) profileUpdates.email = String(email).trim().toLowerCase();
  if (username !== undefined) profileUpdates.username = String(username).trim().toLowerCase();
  if (displayName !== undefined) profileUpdates.displayName = String(displayName).trim();
  if (designation !== undefined) profileUpdates.designation = String(designation || "").trim() || null;
  const managerValue = manager !== undefined ? manager : managerName !== undefined ? managerName : managerUserId;
  const marketValue = market !== undefined ? market : marketName !== undefined ? marketName : marketId;
  if (managerValue !== undefined) profileUpdates.managerUserId = await resolveUserManager(managerValue, user.id);
  if (marketValue !== undefined) profileUpdates.marketId = await resolveMarket(marketValue);
  if (backoffice !== undefined) profileUpdates.backoffice = String(backoffice || "").trim() || null;
  if (marketBackoffice !== undefined) profileUpdates.marketBackoffice = String(marketBackoffice || "").trim() || null;
  if (Object.values(profileUpdates).some((value) => !value && value !== null)) {
    const error = new Error("email, username, and displayName cannot be empty");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  if (status !== undefined) {
    if (!["active", "disabled"].includes(status)) {
      const error = new Error("status must be active or disabled");
      error.status = 400;
      error.code = "CHAT_INVALID_STATUS";
      throw error;
    }
    await user.update({ status });
  }
  if (Object.keys(profileUpdates).length) await user.update(profileUpdates);
  if (roleName !== undefined) {
    const role = await ChatRole.findOne({ where: { name: normalizeRoleName(roleName) } });
    if (!role) {
      const error = new Error("Role not found");
      error.status = 404;
      error.code = "CHAT_ROLE_NOT_FOUND";
      throw error;
    }
    await user.setRoles([role]);
  }
  return toPublicUser(await ChatUser.findByPk(user.id, { include: adminUserInclude }));
};

export const changeAdminUserPassword = async ({ userId, password }) => {
  const user = await ChatUser.findByPk(String(userId));
  if (!user) {
    const error = new Error("Chat user not found");
    error.status = 404;
    error.code = "CHAT_USER_NOT_FOUND";
    throw error;
  }
  assertPassword(password);
  await user.update({ passwordHash: hashPassword(password) });
  return { userId: String(user.id), changed: true };
};

export const getAdminStats = async () => {
  const [total, active, disabled, admins] = await Promise.all([
    ChatUser.count(),
    ChatUser.count({ where: { status: "active" } }),
    ChatUser.count({ where: { status: "disabled" } }),
    ChatUser.count({ include: [{ model: ChatRole, as: "roles", where: { name: ["admin", "superadmin"] }, required: true }] }),
  ]);
  return { total, active, disabled, admins };
};

const buildExternalUsername = (userId, email) => {
  const emailName = String(email || "")
    .split("@")[0]
    .trim()
    .toLowerCase();
  const base = emailName || `user-${String(userId || crypto.randomUUID())}`;

  return (
    base.replace(/[^a-z0-9._-]+/g, "-").replace(/(^-|-$)/g, "") || "chat-user"
  );
};

export const updateChatUserAvatar = async ({
  userId,
  avatarUrl,
  email,
  displayName,
  username,
}) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const normalizedUsername = String(
    username || buildExternalUsername(userId, normalizedEmail),
  )
    .trim()
    .toLowerCase();
  let user = userId ? await ChatUser.findByPk(String(userId)) : null;

  if (!user && normalizedEmail) {
    user = await ChatUser.findOne({ where: { email: normalizedEmail } });
  }

  if (!user) {
    const createPayload = {
      email: normalizedEmail || `${normalizedUsername}@chat.local`,
      username: normalizedUsername,
      displayName:
        String(displayName || "").trim() ||
        normalizedEmail ||
        normalizedUsername ||
        "Chat User",
      passwordHash: hashPassword(crypto.randomUUID()),
      avatarUrl,
      status: "active",
    };

    user = await ChatUser.create(createPayload);
  } else {
    await user.update({
      avatarUrl,
      ...(normalizedEmail && !user.email ? { email: normalizedEmail } : {}),
      ...(displayName ? { displayName: String(displayName).trim() } : {}),
    });
  }

  const fullUser = await ChatUser.findByPk(user.id, { include: includeRoles });

  return toPublicUser(fullUser);
};

export { toPublicUser };
