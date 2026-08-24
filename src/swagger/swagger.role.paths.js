// Swagger API definition module.
import { authenticated, jsonResponse, taggedOperation } from "../helpers/swagger.helpers.js";

export const rolePaths = {
  "/chat-service/roles": {
    ...taggedOperation("Roles", "get", authenticated("List roles")),
    ...taggedOperation("Roles", "post", authenticated("Create a role", { 201: jsonResponse })),
  },
};
