import {
  endChatCall,
  respondChatCall,
  startChatCall,
  listActiveChatCalls,
} from "../Servicess/call.services.js";
import {
  actorFrom,
  createActionController,
  handleRequest,
  sendSuccess,
} from "../helpers/controller.helpers.js";

export const startConversationCall = createActionController({
  action: startChatCall,
  message: "Call is ringing",
  status: 201,
  mapRequest: (req) => ({ chatId: req.params.chatId, type: req.body?.type }),
});

export const getActiveConversationCalls = createActionController({
  action: listActiveChatCalls,
  message: "Active calls loaded",
});
export const respondConversationCall = handleRequest(async (req, res) => {
  const data = await respondChatCall({
    actor: actorFrom(req),
    chatId: req.params.chatId,
    callId: req.params.callId,
    action: req.body?.action,
  });
  return sendSuccess(res, `Call ${data.status}`, data);
});
export const endConversationCall = createActionController({
  action: endChatCall,
  message: "Call ended",
  mapRequest: (req) => ({
    chatId: req.params.chatId,
    callId: req.params.callId,
  }),
});
