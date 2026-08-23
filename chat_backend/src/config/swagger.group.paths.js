import { authenticated, jsonResponse } from "./swagger.helpers.js";

const groupOperation = (method, summary, responses) => ({
  [method]: {
    tags: ["Groups"],
    ...authenticated(summary, responses),
  },
});

export const groupPaths = {
  "/chat-service/groups": groupOperation("get", "List groups"),
  "/chat-service/conversations/groups": groupOperation(
    "post",
    "Open a group conversation",
    { 201: jsonResponse },
  ),
  "/chat-service/conversations/{chatId}": groupOperation(
    "patch",
    "Update a group conversation",
  ),
  "/chat-service/conversations/{chatId}/members": groupOperation(
    "post",
    "Add members to a group conversation",
  ),
  "/chat-service/conversations/{chatId}/members/{userId}": groupOperation(
    "delete",
    "Remove a member from a group conversation",
  ),
  "/chat-service/conversations/{chatId}/leave": groupOperation(
    "post",
    "Leave a group conversation",
  ),
  "/chat-service/conversations/{chatId}/transfer-ownership": groupOperation(
    "post",
    "Transfer group ownership",
  ),
};
