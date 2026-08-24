import {
  readStreamToBuffer,
  uploadToS3,
} from "../helpers/chat.helpers.js";
import { sendChatMessage } from "./message.services.js";

export const sendChatFile = async ({
  actor,
  chatId,
  stream,
  contentType,
  contentLength,
  fileName,
}) => {
  const buffer = await readStreamToBuffer(stream);
  const file = await uploadToS3({
    buffer,
    fileName,
    contentType,
    actor,
    chatId,
  });

  return sendChatMessage({
    actor,
    chatId,
    text: file.name,
    replyTo: null,
    metadata: {
      type: "file",
      contentType: file.contentType,
      contentLength: Number(contentLength) || file.size,
      file,
    },
  });
};


