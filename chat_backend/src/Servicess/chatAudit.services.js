import ChatAuditLog from "../modules/chatAuditLog.module.js";

export const writeChatAuditLog = async ({
  appName = "chat_system",
  appUserId,
  provider = "local_chat",
  action,
  targetUserId,
  targetChatId,
  status = "success",
  metadata,
}) => {
  try {
    return await ChatAuditLog.create({
      appName,
      appUserId,
      provider,
      action,
      targetUserId,
      targetChatId,
      status,
      metadata,
    });
  } catch (error) {
    console.error("Chat audit logging failed:", error.message);
    return null;
  }
};

