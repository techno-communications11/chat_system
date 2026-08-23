import { authenticated, taggedOperation } from "./swagger.helpers.js";

const conversationOperation = (method, summary) =>
  taggedOperation("Conversations", method, authenticated(summary));

export const conversationPaths = {
  "/chat-service/conversations": conversationOperation("get", "List conversations"),
  "/chat-service/conversations/direct/{userId}": conversationOperation(
    "post",
    "Open a direct conversation",
  ),
  "/chat-service/conversations/{chatId}/read": conversationOperation(
    "post",
    "Mark a conversation as read",
  ),
};
