import { getChatActor } from "../../Servicess/chat/identity.services.js";

export const sendSuccess = (res, message, data, status = 200) =>
  res.status(status).json({ status, success: true, message, data });

export const sendError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    status,
    success: false,
    message: error.message || "Chat request failed",
    code: error.code,
    ...(status < 500 && error.details ? { details: error.details } : {}),
    requestId: res.getHeader("X-Request-Id"),
  });
};

export const handleRequest = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    return sendError(res, error);
  }
};

// Adapter used by controllers whose only responsibility is mapping HTTP input
// to a service command and formatting the standard API response.
export const createActionController = ({
  action,
  message,
  status = 200,
  mapRequest = () => ({}),
  authorize,
}) => handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  authorize?.(actor, req);
  const data = await action({ actor, ...mapRequest(req) });
  return sendSuccess(res, message, data, status);
});

export const actorFrom = (req) => getChatActor(req);

export const requireChatAdmin = (actor) => {
  const roles = new Set([actor.role, ...(actor.roles || [])]
    .map((role) => String(role || "").toLowerCase()));
  const permissions = new Set((actor.permissions || [])
    .map((permission) => String(permission).toLowerCase()));
  const isAdmin = ["admin", "superadmin", "super admin"].some((role) => roles.has(role));

  if (!isAdmin && !permissions.has("chat:manage") && !permissions.has("chat:*")) {
    const error = new Error("You do not have permission for this chat action");
    error.status = 403;
    error.code = "CHAT_FORBIDDEN";
    throw error;
  }
};
