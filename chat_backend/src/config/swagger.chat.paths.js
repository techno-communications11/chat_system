import {
  authenticated,
  chatOperation,
  jsonResponse,
} from "./swagger.helpers.js";

const operation = (method, summary, responses) =>
  chatOperation(method, authenticated(summary, responses));

export const chatPaths = {
  "/chat-service/me": operation("get", "Get the current chat identity"),
  "/chat-service/me/status": operation(
    "patch",
    "Update the current user's status",
    {
      204: { description: "Status updated." },
    },
  ),
  "/chat-service/me/settings": {
    ...operation("get", "Get the current user's settings"),
    ...operation("patch", "Update the current user's settings"),
  },
  "/chat-service/me/avatar": operation(
    "patch",
    "Update the current user's avatar",
  ),
  "/chat-service/users": operation("get", "List searchable chat users"),
  "/chat-service/users/{userId}": operation("get", "Get a chat user"),
  "/chat-service/roles": {
    ...operation("get", "List roles"),
    ...operation("post", "Create a role", { 201: jsonResponse }),
  },
  "/chat-service/conversations": operation("get", "List conversations"),
  "/chat-service/groups": operation("get", "List groups"),
  "/chat-service/channels": {
    ...operation("get", "List channels"),
    ...operation("post", "Create a channel", { 201: jsonResponse }),
  },
  "/chat-service/messages/search": operation("get", "Search messages"),
  "/chat-service/admin/audit-logs": operation("get", "List audit logs"),
  "/chat-service/conversations/direct/{userId}": operation(
    "post",
    "Open a direct conversation",
  ),
  "/chat-service/conversations/groups": operation(
    "post",
    "Open a group conversation",
    { 201: jsonResponse },
  ),
  "/chat-service/conversations/{chatId}": operation(
    "patch",
    "Update a conversation",
  ),
  "/chat-service/conversations/{chatId}/members": operation(
    "post",
    "Add conversation members",
  ),
  "/chat-service/conversations/{chatId}/members/{userId}": operation(
    "delete",
    "Remove a conversation member",
  ),
  "/chat-service/conversations/{chatId}/leave": operation(
    "post",
    "Leave a conversation",
  ),
  "/chat-service/conversations/{chatId}/transfer-ownership": operation(
    "post",
    "Transfer group ownership",
  ),
  "/chat-service/conversations/{chatId}/read": operation(
    "post",
    "Mark a conversation as read",
  ),
  "/chat-service/conversations/{chatId}/messages": {
    ...operation("get", "List conversation messages"),
    ...operation("delete", "Clear this user's conversation history"),
  },
  "/chat-service/conversations/{chatId}/messages/{messageId}": {
    ...operation("patch", "Edit a message"),
    ...operation("delete", "Soft-delete a message"),
  },
  "/chat-service/messages/direct/{userId}": operation(
    "post",
    "Send a direct message",
  ),
  "/chat-service/messages/multiple": operation(
    "post",
    "Send messages to multiple users",
  ),
  "/chat-service/messages/broadcast": operation("post", "Broadcast a message"),
  "/chat-service/conversations/{chatId}/files": operation(
    "post",
    "Upload a conversation file",
  ),
  "/chat-service/conversations/{chatId}/calls": operation(
    "post",
    "Start a conversation call",
  ),
  "/chat-service/calls/active": operation(
    "get",
    "Restore active calls after reconnecting",
  ),
  "/chat-service/conversations/{chatId}/calls/{callId}/end": operation(
    "post",
    "End a conversation call",
  ),
  "/chat-service/conversations/{chatId}/calls/{callId}/respond": operation(
    "post",
    "Respond to a conversation call",
  ),
  "/chat-service/conversations/{chatId}/messages/{messageId}": operation(
    "patch",
    "Edit a message",
  ),
  "/chat-service/conversations/{chatId}/messages/{messageId}/pin": operation(
    "patch",
    "Pin or unpin a message",
  ),
  "/chat-service/conversations/{chatId}/messages/{messageId}/reactions":
    operation("post", "Add a message reaction"),
  "/chat-service/conversations/{chatId}/messages/{messageId}/reactions/{emoji}":
    operation("delete", "Remove a message reaction"),
};
