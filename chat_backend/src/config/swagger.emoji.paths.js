import { authenticated } from "./swagger.helpers.js";

const emojiOperation = (method, summary) => ({
  [method]: {
    tags: ["Emoji"],
    ...authenticated(summary),
  },
});

export const emojiPaths = {
  "/chat-service/conversations/{chatId}/messages/{messageId}/reactions":
    emojiOperation("post", "Add an emoji reaction to a message"),
  "/chat-service/conversations/{chatId}/messages/{messageId}/reactions/{emoji}":
    emojiOperation("delete", "Remove an emoji reaction from a message"),
};
