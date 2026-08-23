import { authPaths } from "./swagger.auth.paths.js";
import { callPaths } from "./swagger.call.paths.js";
import { groupPaths } from "./swagger.group.paths.js";
import { emojiPaths } from "./swagger.emoji.paths.js";
import { identityPaths } from "./swagger.identity.paths.js";
import { conversationPaths } from "./swagger.conversation.paths.js";
import { messagePaths } from "./swagger.message.paths.js";
import { channelPaths } from "./swagger.channel.paths.js";
import { filePaths } from "./swagger.file.paths.js";
import { rolePaths } from "./swagger.role.paths.js";
import { adminPaths } from "./swagger.admin.paths.js";
import { healthPaths } from "./swagger.health.paths.js";
import { schemas } from "./swagger.schemas.js";

export const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Chat System API",
    version: "0.1.0",
    description: "REST API for the Chat System backend.",
  },
  servers: [{ url: "/", description: "Current chat backend" }],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Authentication", description: "Legacy chat authentication" },
    { name: "Calls", description: "Audio/video conversation calls" },
    { name: "Groups", description: "Group conversations and membership" },
    { name: "Emoji", description: "Emoji reactions on messages" },
    { name: "Identity", description: "Profiles, users, status, and settings" },
    { name: "Conversations", description: "Direct conversations and read state" },
    { name: "Messages", description: "Sending, searching, and managing messages" },
    { name: "Channels", description: "Chat channel management" },
    { name: "Files", description: "Conversation file uploads" },
    { name: "Roles", description: "Chat role management" },
    { name: "Admin", description: "Administrative audit APIs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
  paths: {
    ...healthPaths,
    ...authPaths,
    ...callPaths,
    ...groupPaths,
    ...emojiPaths,
    ...identityPaths,
    ...conversationPaths,
    ...messagePaths,
    ...channelPaths,
    ...filePaths,
    ...rolePaths,
    ...adminPaths,
  },
};
