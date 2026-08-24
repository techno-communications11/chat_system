// Swagger API definition module.
import { jsonResponse } from "../helpers/swagger.helpers.js";

export const healthPaths = {
  "/ping": {
    get: {
      tags: ["Health"],
      summary: "Check whether the backend is awake",
      responses: { 200: jsonResponse },
    },
  },
  "/api/v1/health": {
    get: {
      tags: ["Health"],
      summary: "Check API health",
      responses: { 200: jsonResponse },
    },
  },
};
