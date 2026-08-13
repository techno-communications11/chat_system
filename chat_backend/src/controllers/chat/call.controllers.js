import {
  endChatCall,
  respondChatCall,
  startChatCall,
  listActiveChatCalls,
} from "../../Servicess/chat/call.services.js";
import { actorFrom, handleRequest, sendSuccess } from "./controller.helpers.js";

export const startConversationCall = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Call is ringing",
    await startChatCall({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      type: req.body?.type,
    }),
    201,
  ),
);
export const getActiveConversationCalls = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Active calls loaded",
    await listActiveChatCalls({ actor: actorFrom(req) }),
  ),
);
export const respondConversationCall = handleRequest(async (req, res) => {
  const data = await respondChatCall({
    actor: actorFrom(req),
    chatId: req.params.chatId,
    callId: req.params.callId,
    action: req.body?.action,
  });
  return sendSuccess(res, `Call ${data.status}`, data);
});
export const endConversationCall = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Call ended",
    await endChatCall({
      actor: actorFrom(req),
      chatId: req.params.chatId,
      callId: req.params.callId,
    }),
  ),
);
