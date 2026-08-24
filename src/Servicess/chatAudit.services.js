import ChatAuditLog from "../modules/chatAuditLog.module.js";
import { chatConfig } from "../config/chat.config.js";

export const writeChatAuditLog = async ({
  appName = chatConfig.defaultAppName,
  appUserId,
  provider = chatConfig.provider,
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
    console.error(
      JSON.stringify({
        event: "chat_audit_log_failed",
        appName,
        appUserId,
        provider,
        action,
        targetUserId,
        targetChatId,
        error: error.message,
      }),
    );
    return null;
  }
};
