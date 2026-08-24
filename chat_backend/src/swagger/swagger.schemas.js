// Swagger API definition module.
export const schemas = {
  ApiResponse: {
    type: "object",
    additionalProperties: true,
    description: "The response envelope returned by the chat API.",
  },
  TextMessage: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string", example: "Hello from chat" },
      replyTo: { type: "integer", nullable: true, example: 42 },
    },
  },
  UserIds: {
    type: "object",
    required: ["userIds"],
    properties: { userIds: { type: "array", items: { type: "string" } } },
  },
};
