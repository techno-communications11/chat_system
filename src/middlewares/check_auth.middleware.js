import { getBearerToken, verifyChatToken } from "../auth/chatAuth.js";

const checkAuth = (req, res, next) => {
  try {
    const token = getBearerToken(req.header("Authorization"));
    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          code: "CHAT_AUTH_REQUIRED",
          message: "A Bearer token is required",
        });
    }

    const auth = verifyChatToken(token, {
      requestedApp: req.header("x-chat-app-name"),
    });
    req.authToken = token;
    req.auth = auth;
    req.user = auth.payload;
    return next();
  } catch (error) {
    return res
      .status(error.code === "CHAT_AUTH_APP_FORBIDDEN" ? 403 : 401)
      .json({
        success: false,
        code: error.code || "CHAT_AUTH_INVALID",
        message: "Authentication failed",
      });
  }
};

export default checkAuth;
