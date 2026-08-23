import { authenticated, taggedOperation } from "./swagger.helpers.js";

const channelOperation = (method, summary) =>
  taggedOperation("Channels", method, authenticated(summary));

export const channelPaths = {
  "/chat-service/channels": {
    ...channelOperation("get", "List channels"),
    ...channelOperation("post", "Create a channel"),
  },
};
