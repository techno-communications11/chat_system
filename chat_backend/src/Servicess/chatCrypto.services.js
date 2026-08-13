import crypto from "crypto";
import serverConfig from "../config/server.config.js";

const algorithm = "aes-256-gcm";

const getKey = () => {
  const source =
    process.env.CHAT_TOKEN_ENCRYPTION_KEY ||
    process.env.SERVER_SECRETS ||
    serverConfig.secretKey;

  if (!source) {
    throw new Error("CHAT_TOKEN_ENCRYPTION_KEY or SERVER_SECRETS is required");
  }

  return crypto.createHash("sha256").update(String(source)).digest();
};

export const encryptSecret = (plainText) => {
  if (!plainText) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptSecret = (payload) => {
  if (!payload) return null;

  const [ivText, authTagText, encryptedText] = String(payload).split(".");

  if (!ivText || !authTagText || !encryptedText) {
    throw new Error("Encrypted secret payload is invalid");
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(ivText, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
