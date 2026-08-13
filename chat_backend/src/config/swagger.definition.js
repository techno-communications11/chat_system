import { authPaths } from "./swagger.auth.paths.js";
import { chatPaths } from "./swagger.chat.paths.js";
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
    {
      name: "Chat",
      description: "Chat, conversations, messages, calls, and reactions",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas,
  },
  paths: { ...healthPaths, ...authPaths, ...chatPaths },
};
