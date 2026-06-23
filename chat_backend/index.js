import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import router from "./src/routing/index.js";
import sequelize, { ensureDatabase } from "./src/config/db.js";
import { syncModels } from "./src/modules/index.js";
import { initChatSocket } from "./src/realtime/chatSocket.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4600;
const configuredClientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredClientUrls,
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);
let server;
let isShuttingDown = false;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-access-token",
      "x-chat-app-name",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb", type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/", router);

const start = async () => {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    await syncModels();
    console.log("Chat database connected and synced");

    const httpServer = http.createServer(app);
    initChatSocket(httpServer, allowedOrigins);

    server = httpServer.listen(PORT, () => {
      console.log(`Chat backend running on http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Chat backend may already be running.`,
        );
        process.exit(1);
      }

      console.error("Chat backend server error:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Chat backend failed to start:", error.message);
    process.exit(1);
  }
};

start();

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down chat backend...`);

  if (!server) {
    process.exit(0);
  }

  server.close(async (error) => {
    if (error) {
      console.error("Chat backend shutdown failed:", error.message);
      process.exit(1);
    }

    try {
      await sequelize.close();
    } catch (dbCloseError) {
      console.error("Database shutdown failed:", dbCloseError.message);
    }

    process.exit(0);
  });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGUSR2", () => shutdown("SIGUSR2"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});
