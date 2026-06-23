import express from "express";
import chatServiceRouter from "./chatService.route.js";

const router = express.Router();

router.use("/chat-service", chatServiceRouter);
router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Chat backend is awake" });
});

export default router;
