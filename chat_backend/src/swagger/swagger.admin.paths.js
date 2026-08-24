// Swagger API definition module.
import { authenticated, taggedOperation } from "../helpers/swagger.helpers.js";

export const adminPaths = {
  "/chat-service/admin/audit-logs": taggedOperation(
    "Admin",
    "get",
    authenticated("List audit logs"),
  ),
};
