import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import serverConfig from "../config/server.config.js";
import ChatUser from "../modules/chatUser.module.js";
import ChatRole from "../modules/chatRole.module.js";
import { normalizeAppName } from "./applicationDirectory.services.js";

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, passwordHash) => {
  const [salt, storedHash] = String(passwordHash || "").split(":");
  if (!salt || !storedHash) return false;

  const candidate = hashPassword(password, salt).split(":")[1];
  const candidateBuffer = Buffer.from(candidate, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  return candidateBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, storedBuffer);
};

const assertPassword = (password) => {
  if (typeof password !== "string" || password.length < 8 || password.length > 256) {
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

  return {
    id: String(plainUser.id),
    user_id: String(plainUser.id),
    email: plainUser.email,
    email_id: plainUser.email,
    username: plainUser.username,
    name: plainUser.displayName,
    display_name: plainUser.displayName,
    avatarUrl: plainUser.avatarUrl,
    status: plainUser.status,
    presence: plainUser.presence,
    lastSeenAt: plainUser.lastSeenAt,
    role: roleNames[0] || "member",
    roles: roleNames,
    provider: "local_chat",
    createdAt: plainUser.createdAt,
    updatedAt: plainUser.updatedAt,
  };
};

const issueToken = (user, { appName } = {}) => {
  const publicUser = toPublicUser(user);
  const appClaim = appName || process.env.CHAT_LOCAL_APP_NAME;
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
      tenant_id: process.env.CHAT_LOCAL_TENANT_ID || "local",
      ...appClaims,
      jti: crypto.randomUUID(),
    },
    serverConfig.secretKey,
    {
      expiresIn: process.env.CHAT_JWT_EXPIRES_IN || "15m",
      issuer: process.env.CHAT_JWT_ISSUER || "chat-local",
      audience: process.env.CHAT_JWT_AUDIENCE || "chat-api",
      subject: publicUser.id,
    },
  );
};

const includeRoles = [{ model: ChatRole, as: "roles", through: { attributes: [] } }];

export const listChatDirectoryUsers = async ({ search, limit = 50, excludeUserId } = {}) => {
  const where = { status: "active" };

  if (search) {
    where[Op.or] = [
      { email: { [Op.like]: `%${search}%` } },
      { username: { [Op.like]: `%${search}%` } },
      { displayName: { [Op.like]: `%${search}%` } },
    ];
  }

  if (excludeUserId) {
    where.id = { [Op.ne]: Number(excludeUserId) || 0 };
  }

  const users = await ChatUser.findAll({
    where,
    include: includeRoles,
    limit,
    order: [["displayName", "ASC"], ["username", "ASC"]],
  });

  return users.map(toPublicUser);
};

export const getChatDirectoryUserById = async (userId) => {
  if (!userId) return null;

  const user = await ChatUser.findOne({
    where: { id: Number(userId) || 0 },
    include: includeRoles,
  });

  return user ? toPublicUser(user) : null;
};

export const registerChatUser = async ({
  email,
  username,
  displayName,
  password,
  roleName = "member",
}) => {
  if (!email || !username || !displayName || !password) {
    const error = new Error("email, username, displayName, and password are required");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }
  assertPassword(password);

  const role = await ChatRole.findOne({ where: { name: normalizeRoleName(roleName) } });

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
    token: issueToken(fullUser),
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

  if (!user || !verifyPassword(password, user.passwordHash) || user.status !== "active") {
    const error = new Error("Invalid chat login");
    error.status = 401;
    error.code = "CHAT_LOGIN_FAILED";
    throw error;
  }

  await user.update({ presence: "online", lastSeenAt: new Date() });
  const fullUser = await ChatUser.findByPk(user.id, { include: includeRoles });

  return {
    user: toPublicUser(fullUser),
    token: issueToken(fullUser, { appName }),
  };
};

export const listChatRoles = async () => ChatRole.findAll({ order: [["name", "ASC"]] });

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

const buildExternalUsername = (userId, email) => {
  const emailName = String(email || "").split("@")[0].trim().toLowerCase();
  const base = emailName || `user-${String(userId || crypto.randomUUID())}`;

  return base.replace(/[^a-z0-9._-]+/g, "-").replace(/(^-|-$)/g, "") || "chat-user";
};

export const updateChatUserAvatar = async ({
  userId,
  avatarUrl,
  email,
  displayName,
  username,
}) => {
  const numericUserId = Number(userId) || 0;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedUsername = String(username || buildExternalUsername(userId, normalizedEmail))
    .trim()
    .toLowerCase();
  let user = numericUserId ? await ChatUser.findByPk(numericUserId) : null;

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

    if (numericUserId) {
      createPayload.id = numericUserId;
    }

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
