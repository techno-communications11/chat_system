// Swagger API definition module.
import { authenticated, taggedOperation } from "../helpers/swagger.helpers.js";

export const filePaths = {
  "/chat-service/conversations/{chatId}/files": taggedOperation(
    "Files",
    "post",
    authenticated("Upload a conversation file"),
  ),
};
