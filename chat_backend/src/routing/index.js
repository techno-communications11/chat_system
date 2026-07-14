import express from "express";
import chatServiceRouter from "./chatService.route.js";

const router = express.Router();

router.use("/chat-service", chatServiceRouter);
router.use("/api/v1/chat", chatServiceRouter);
router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Chat backend is awake" });
});
router.get("/api/v1/health", (req, res) => {
  res.json({ success: true, version: "v1", status: "ok" });
});

export default router;
