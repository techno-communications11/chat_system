import http from "http";
import https from "https";
import fs from "fs";
import { createApp, allowedOrigins } from "./src/app.js";
import sequelize, { ensureDatabase } from "./src/config/db.js";
import { syncModels } from "./src/modules/index.js";
import { initChatSocket } from "./src/realtime/chatSocket.js";
import { runtimeConfig, validateRuntimeConfig } from "./src/config/runtime.config.js";

validateRuntimeConfig();

const app = createApp();
const PORT = runtimeConfig.port;
const HOST = process.env.HOST;
let server;
let isShuttingDown = false;

const start = async () => {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    await syncModels();
    console.log("Chat database connected and synced");

    const httpsKeyPath = process.env.HTTPS_KEY_PATH;
    const httpsCertPath = process.env.HTTPS_CERT_PATH;
    const httpServer = httpsKeyPath && httpsCertPath
      ? https.createServer(
          {
            key: fs.readFileSync(httpsKeyPath),
            cert: fs.readFileSync(httpsCertPath),
          },
          app,
        )
      : http.createServer(app);
    initChatSocket(httpServer, allowedOrigins);

    server = httpServer.listen(PORT, HOST, () => {
      console.log(
        `Chat backend running on ${httpsKeyPath && httpsCertPath ? "https" : "http"}://${HOST}:${PORT}`,
      );
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
