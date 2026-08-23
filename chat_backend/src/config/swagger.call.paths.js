import { authenticated } from "./swagger.helpers.js";

const callOperation = (method, summary, responses) => ({
  [method]: {
    tags: ["Calls"],
    ...authenticated(summary, responses),
  },
});

export const callPaths = {
  "/chat-service/conversations/{chatId}/calls": callOperation(
    "post",
    "Start a conversation call",
  ),
  "/chat-service/calls/active": callOperation(
    "get",
    "Restore active calls after reconnecting",
  ),
  "/chat-service/conversations/{chatId}/calls/{callId}/end": callOperation(
    "post",
    "End a conversation call",
  ),
  "/chat-service/conversations/{chatId}/calls/{callId}/respond": callOperation(
    "post",
    "Respond to a conversation call",
  ),
};
