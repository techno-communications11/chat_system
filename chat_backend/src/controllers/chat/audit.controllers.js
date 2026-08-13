import { getChatAuditLogs } from "../../Servicess/chat/audit.services.js";
import {
  actorFrom,
  handleRequest,
  requireChatAdmin,
  sendSuccess,
} from "./controller.helpers.js";

export const listChatAuditLogs = handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  return sendSuccess(
    res,
    "Chat audit logs fetched",
    await getChatAuditLogs({ actor, query: req.query }),
  );
});
