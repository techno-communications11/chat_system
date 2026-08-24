// Swagger API definition module.
import { authenticated, taggedOperation } from "../helpers/swagger.helpers.js";

const channelOperation = (method, summary) =>
  taggedOperation("Channels", method, authenticated(summary));

export const channelPaths = {
  "/chat-service/channels": {
    ...channelOperation("get", "List channels"),
    ...channelOperation("post", "Create a channel"),
  },
};
