// Swagger API definition module.
import { authenticated, taggedOperation } from "../helpers/swagger.helpers.js";

const identityOperation = (method, summary) =>
  taggedOperation("Identity", method, authenticated(summary));

export const identityPaths = {
  "/chat-service/me": identityOperation("get", "Get the current chat identity"),
  "/chat-service/me/status": taggedOperation(
    "Identity",
    "patch",
    authenticated("Update the current user's status", {
      204: { description: "Status updated." },
    }),
  ),
  "/chat-service/me/settings": {
    ...identityOperation("get", "Get the current user's settings"),
    ...identityOperation("patch", "Update the current user's settings"),
  },
  "/chat-service/me/avatar": identityOperation("patch", "Update the current user's avatar"),
  "/chat-service/users": identityOperation("get", "List searchable chat users"),
  "/chat-service/users/{userId}": identityOperation("get", "Get a chat user"),
};
