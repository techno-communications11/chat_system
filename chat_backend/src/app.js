import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import router from "./routing/index.js";
import { runtimeConfig } from "./config/runtime.config.js";
import { apiRateLimit, errorHandler, platformSecurityHeaders } from "./middlewares/platformSecurity.middleware.js";

export const allowedOrigins = new Set([
  ...runtimeConfig.clientOrigins,
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", runtimeConfig.trustProxyHops);

  app.use(platformSecurityHeaders);
  app.use(apiRateLimit);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", "Authorization", "x-access-token", "x-chat-app-name",
      "x-file-name", "x-file-content-type", "x-file-size",
    ],
    credentials: true,
  }));

  app.use(express.json({ limit: "5mb", type: ["application/json", "text/plain"] }));
  app.use(express.urlencoded({ extended: false, limit: "5mb", parameterLimit: 100 }));
  app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Chat System API Docs",
  }));
  app.use("/", router);
  app.use(errorHandler);
  return app;
};

export default createApp;
