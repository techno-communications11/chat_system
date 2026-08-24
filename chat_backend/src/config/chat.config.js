import loadEnv from "./loadEnv.js";

loadEnv();

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeAppName = (value) =>
  String(value || "chat_system")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "chat_system";

export const chatConfig = Object.freeze({
  provider: "local_chat",
  defaultAppName: "chat_system",
  encryptionKey:
    process.env.CHAT_TOKEN_ENCRYPTION_KEY || process.env.SERVER_SECRETS || "",
  localAuth: Object.freeze({
    appName: process.env.CHAT_LOCAL_APP_NAME || "",
    tenantId: process.env.CHAT_LOCAL_TENANT_ID || "local",
    jwtExpiresIn: process.env.CHAT_JWT_EXPIRES_IN || "15m",
    jwtIssuer: process.env.CHAT_JWT_ISSUER || "chat-local",
    jwtAudience: process.env.CHAT_JWT_AUDIENCE || "chat-api",
  }),
  callTimeouts: Object.freeze({
    ringing: positiveNumber(
      process.env.CHAT_CALL_RING_TIMEOUT_MS,
      2 * 60 * 1000,
    ),
    connecting: positiveNumber(
      process.env.CHAT_CALL_CONNECT_TIMEOUT_MS,
      2 * 60 * 1000,
    ),
    accepted: positiveNumber(
      process.env.CHAT_CALL_MAX_DURATION_MS,
      4 * 60 * 60 * 1000,
    ),
  }),
  s3: Object.freeze({
    bucket: process.env.AWS_BUCKET_NAME || "",
    region: process.env.AWS_BUCKET_REGION || "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  }),
});

export const getApplicationDirectoryUrl = (appName) => {
  const normalizedAppName = normalizeAppName(appName);
  const envKey = `CHAT_PROVIDER_${normalizedAppName.toUpperCase()}_USERS_URL`;
  const directUrl = process.env[envKey] || "";
  if (directUrl) return directUrl;

  try {
    const providers = JSON.parse(process.env.CHAT_PROVIDER_USERS_URLS || "{}");
    return (
      providers[appName] ||
      providers[normalizedAppName] ||
      providers.default ||
      ""
    );
  } catch {
    return "";
  }
};
