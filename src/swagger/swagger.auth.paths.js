// Swagger API definition module.
import { jsonResponse, requestBody } from "../helpers/swagger.helpers.js";

export const authPaths = {
  "/chat-service/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a chat user",
      requestBody: requestBody({ type: "object", additionalProperties: true }),
      responses: {
        200: jsonResponse,
        400: { description: "Invalid registration details." },
      },
    },
  },
  "/chat-service/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Log in to the chat service",
      requestBody: requestBody({
        type: "object",
        required: ["login", "password"],
        properties: {
          login: { type: "string", example: "agent@example.com" },
          password: { type: "string", format: "password" },
          type: { type: "string", example: "ticket_portal" },
        },
      }),
      responses: {
        200: jsonResponse,
        401: { description: "Invalid credentials." },
      },
    },
  },
};
