const MAX_AVATAR_LENGTH = 500_000;

export const normalizeAvatarUrl = (avatarUrl) => {
  const value = String(avatarUrl || "").trim();

  if (!value) {
    const error = new Error("avatarUrl is required");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }

  if (value.length > MAX_AVATAR_LENGTH) {
    const error = new Error("avatarUrl is too large");
    error.status = 400;
    error.code = "CHAT_INVALID_INPUT";
    throw error;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) {
    return value;
  }

  const error = new Error("avatarUrl must be an http(s) URL or image data URL");
  error.status = 400;
  error.code = "CHAT_INVALID_INPUT";
  throw error;
};
