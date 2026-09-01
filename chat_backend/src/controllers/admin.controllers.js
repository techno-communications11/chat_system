import {
  bulkCreateAdminUsers,
  changeAdminUserPassword,
  createAdminUser,
  getAdminStats,
  getAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "../Servicess/chatUser.services.js";
import {
  actorFrom,
  handleRequest,
  requireChatAdmin,
  sendSuccess,
} from "../helpers/controller.helpers.js";

const authorize = (req) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  return actor;
};

export const getAdminDashboard = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(res, "Admin dashboard fetched", await getAdminStats());
});

export const listAdminUsersController = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(res, "Admin users fetched", await listAdminUsers(req.query));
});

export const getAdminUserController = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(res, "Admin user fetched", await getAdminUser(req.params.userId));
});

export const createAdminUserController = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(res, "User created", await createAdminUser(req.body), 201);
});

export const bulkCreateAdminUsersController = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(res, "Bulk user upload processed", await bulkCreateAdminUsers(req.body?.users));
});

export const updateAdminUserController = handleRequest(async (req, res) => {
  const actor = authorize(req);
  const targetId = String(req.params.userId);
  if (String(actor.appUserId) === targetId && req.body?.status === "disabled") {
    const error = new Error("You cannot restrict your own admin account");
    error.status = 400;
    error.code = "CHAT_SELF_RESTRICTION_FORBIDDEN";
    throw error;
  }
  return sendSuccess(
    res,
    "User updated",
    await updateAdminUser({
      userId: targetId,
      status: req.body?.status,
      roleName: req.body?.roleName || req.body?.role,
      email: req.body?.email,
      username: req.body?.username,
      displayName: req.body?.displayName,
      designation: req.body?.designation,
      manager: req.body?.manager,
      managerName: req.body?.managerName,
      managerUserId: req.body?.managerUserId,
      market: req.body?.market,
      marketName: req.body?.marketName,
      marketId: req.body?.marketId,
      backoffice: req.body?.backoffice,
      marketBackoffice: req.body?.marketBackoffice,
    }),
  );
});

export const changeAdminUserPasswordController = handleRequest(async (req, res) => {
  authorize(req);
  return sendSuccess(
    res,
    "User password changed",
    await changeAdminUserPassword({ userId: req.params.userId, password: req.body?.password }),
  );
});
