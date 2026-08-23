import { authenticated, jsonResponse, taggedOperation } from "./swagger.helpers.js";

export const rolePaths = {
  "/chat-service/roles": {
    ...taggedOperation("Roles", "get", authenticated("List roles")),
    ...taggedOperation("Roles", "post", authenticated("Create a role", { 201: jsonResponse })),
  },
};
