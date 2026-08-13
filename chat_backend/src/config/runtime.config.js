import loadEnv from "./loadEnv.js";

loadEnv();

const parsePort = (value) => {
  const port = Number(value || 4701);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
};

const parseTrustProxy = (value) => {
  const hops = Number(value || 0);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }
  return hops;
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const runtimeConfig = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parsePort(process.env.PORT),
  trustProxyHops: parseTrustProxy(process.env.TRUST_PROXY_HOPS),
  clientOrigins: parseOrigins(process.env.CLIENT_URL),
  rateLimitWindowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMax: Number(process.env.CHAT_RATE_LIMIT_MAX || 300),
  authRateLimitMax: Number(process.env.CHAT_AUTH_RATE_LIMIT_MAX || 15),
});

export const validateRuntimeConfig = () => {
  const secret = String(process.env.SERVER_SECRETS || "");
  if (runtimeConfig.nodeEnv === "production" && secret.length < 32) {
    throw new Error(
      "SERVER_SECRETS must contain at least 32 characters in production",
    );
  }
  if (runtimeConfig.clientOrigins.length === 0) {
    throw new Error(
      "CLIENT_URL must contain at least one allowed frontend origin",
    );
  }
  if (
    !Number.isFinite(runtimeConfig.rateLimitWindowMs) ||
    runtimeConfig.rateLimitWindowMs <= 0
  ) {
    throw new Error("CHAT_RATE_LIMIT_WINDOW_MS must be positive");
  }
  if (
    !Number.isInteger(runtimeConfig.rateLimitMax) ||
    runtimeConfig.rateLimitMax <= 0
  ) {
    throw new Error("CHAT_RATE_LIMIT_MAX must be a positive integer");
  }
};
