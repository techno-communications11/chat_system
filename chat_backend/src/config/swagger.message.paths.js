import { authenticated, taggedOperation } from "./swagger.helpers.js";

const messageOperation = (method, summary) =>
  taggedOperation("Messages", method, authenticated(summary));

export const messagePaths = {
  "/chat-service/messages/search": messageOperation("get", "Search messages"),
  "/chat-service/conversations/{chatId}/messages": {
    ...messageOperation("get", "List conversation messages"),
    ...messageOperation("delete", "Clear this user's conversation history"),
  },
  "/chat-service/conversations/{chatId}/messages/{messageId}": {
    ...messageOperation("patch", "Edit a message"),
    ...messageOperation("delete", "Soft-delete a message"),
  },
  "/chat-service/messages/direct/{userId}": messageOperation("post", "Send a direct message"),
  "/chat-service/messages/multiple": messageOperation("post", "Send messages to multiple users"),
  "/chat-service/messages/broadcast": messageOperation("post", "Broadcast a message"),
  "/chat-service/conversations/{chatId}/messages/{messageId}/pin": messageOperation(
    "patch",
    "Pin or unpin a message",
  ),
};
