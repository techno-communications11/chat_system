import {
  registerChatUser,
  loginChatUser,
} from "../Servicess/chatUser.services.js";
import { handleRequest, sendSuccess } from "../helpers/controller.helpers.js";

export const registerUser = handleRequest(async (req, res) => {
  const data = await registerChatUser({
    email: req.body?.email,
    username: req.body?.username,
    displayName: req.body?.displayName || req.body?.name,
    password: req.body?.password,
    roleName: req.body?.roleName || req.body?.role,
  });
  return sendSuccess(res, "Chat user registered", data, 201);
});

export const loginUser = handleRequest(async (req, res) => {
  const data = await loginChatUser({
    login: req.body?.login || req.body?.email || req.body?.username,
    password: req.body?.password,
    appName:
      req.body?.type || req.body?.app || req.body?.appName || req.body?.portal,
  });
  return sendSuccess(res, "Chat login successful", data);
});
