import {
  getChatConnectionStatus,
  getChatUserProfile,
  getChatUserSettings,
  getChatUsers,
  updateChatAvatar,
  updateChatUserSettings,
  updateChatPresence,
} from "../Servicess/identity.services.js";
import {
  createChatRole,
  listChatRoles,
} from "../Servicess/identity.services.js";
import {
  handleRequest,
  sendSuccess,
  actorFrom,
  requireChatAdmin,
} from "../helpers/controller.helpers.js";

export const listRoles = handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  return sendSuccess(res, "Chat roles fetched", await listChatRoles());
});

export const createRole = handleRequest(async (req, res) => {
  const actor = actorFrom(req);
  requireChatAdmin(actor);
  const data = await createChatRole({
    name: req.body?.name,
    description: req.body?.description,
    permissions: req.body?.permissions,
  });
  return sendSuccess(res, "Chat role created", data, 201);
});

export const getChatMe = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat connection status",
    await getChatConnectionStatus({ actor: actorFrom(req) }),
  ),
);

export const updateChatStatus = handleRequest(async (req, res) => {
  const data = await updateChatPresence({
    actor: actorFrom(req),
    presence: req.body?.presence || req.body?.status,
  });
  return sendSuccess(res, "Chat status updated", data);
});

export const getChatSettings = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat settings fetched",
    await getChatUserSettings({ userId: actorFrom(req).appUserId }),
  ),
);

export const updateChatSettings = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat settings updated",
    await updateChatUserSettings({
      userId: actorFrom(req).appUserId,
      settings: req.body || {},
    }),
  ),
);

export const updateChatAvatarController = handleRequest(async (req, res) => {
  const contentType = req.headers["content-type"];
  const data = await updateChatAvatar({
    actor: actorFrom(req),
    avatarUrl:
      req.body?.avatarUrl || req.body?.avatar_url || req.body?.imageUrl,
    stream:
      contentType && !String(contentType).includes("application/json")
        ? req
        : null,
    contentType: req.headers["x-file-content-type"] || contentType,
    fileName: req.headers["x-file-name"],
  });
  return sendSuccess(res, "Profile picture updated", data);
});

export const listChatUsers = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat users fetched",
    await getChatUsers({ actor: actorFrom(req), query: req.query }),
  ),
);

export const getChatUser = handleRequest(async (req, res) =>
  sendSuccess(
    res,
    "Chat user profile fetched",
    await getChatUserProfile({
      actor: actorFrom(req),
      userId: req.params.userId,
    }),
  ),
);
