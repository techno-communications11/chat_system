import { authenticated, taggedOperation } from "./swagger.helpers.js";

export const adminPaths = {
  "/chat-service/admin/audit-logs": taggedOperation(
    "Admin",
    "get",
    authenticated("List audit logs"),
  ),
};
