// Swagger API helper functions.
export const jsonResponse = {
  description: "The request was processed successfully.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiResponse" },
    },
  },
};

const authResponses = {
  401: { description: "Authentication is required or the token is invalid." },
  403: { description: "The authenticated user is not allowed to perform this action." },
};

export const authenticated = (summary, responses = {}) => ({
  summary,
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: "x-chat-app-name",
      in: "header",
      required: false,
      description: "Host application name used for provider-specific user discovery.",
      schema: { type: "string", example: "ticket_portal" },
    },
  ],
  responses: { 200: jsonResponse, ...authResponses, ...responses },
});

export const requestBody = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
});

export const taggedOperation = (tag, method, operation) => ({
  [method]: { tags: [tag], ...operation },
});

export const chatOperation = (method, operation) =>
  taggedOperation("Chat", method, operation);
