import ChatAuditLog from "../modules/chatAuditLog.module.js";
import { normalizeLimit, ensureLocalIdentity } from "../helpers/chat.helpers.js";

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
