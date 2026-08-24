import ChatCall from "../modules/chatCall.module.js";
import ChatConversation from "../modules/chatConversation.module.js";
import sequelize from "../config/db.js";
import { Op, Transaction } from "sequelize";
import { chatConfig } from "../config/chat.config.js";

export class ChatCallError extends Error {
  constructor(
    message,
    { status = 400, code = "CHAT_CALL_INVALID", details } = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const activeStatuses = ["ringing", "connecting", "accepted"];
const staleAfterMs = chatConfig.callTimeouts;

export const toCallPayload = (record, additions = {}) => ({
  id: record.callId,
  chatId: String(record.conversationId),
  type: record.type,
  status: record.status,
  provider: record.provider,
  startedAt: record.startedAt,
  endedAt: record.endedAt || undefined,
  startedBy: {
    id: String(record.startedByUserId),
    ...(record.metadata?.startedBy || {}),
  },
  ...(record.metadata?.acceptedBy
    ? { acceptedBy: record.metadata.acceptedBy }
    : {}),
  ...additions,
});

// A browser can close before it sends the end event. Retire abandoned rows so
// one lost event cannot permanently block every future call in a conversation.
export const expireStaleCalls = async ({
  appName,
  conversationId,
  now = new Date(),
  transaction,
}) => {
  const records = await ChatCall.findAll({
    where: { appName, conversationId, status: activeStatuses },
    ...(transaction ? { transaction, lock: Transaction.LOCK.UPDATE } : {}),
  });

  for (const record of records) {
    const lastActivity = new Date(
      record.updatedAt || record.startedAt,
    ).getTime();
    if (now.getTime() - lastActivity < staleAfterMs[record.status]) continue;

    const previousStatus = record.status;
    const terminalStatus = previousStatus === "accepted" ? "ended" : "failed";
    const [updated] = await ChatCall.update(
      {
        status: terminalStatus,
        endedAt: now,
        metadata: { ...(record.metadata || {}), endReason: "timeout" },
      },
      {
        where: { id: record.id, status: previousStatus },
        ...(transaction ? { transaction } : {}),
      },
    );

    if (!updated) continue;
  }
};

export const createRingingCall = async ({
  appName,
  conversationId,
  callId,
  type,
  actor,
}) => {
  return sequelize.transaction(async (transaction) => {
    await ChatConversation.findByPk(conversationId, {
      attributes: ["id"],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    await expireStaleCalls({ appName, conversationId, transaction });
    const existing = await ChatCall.findOne({
      where: { appName, conversationId, status: activeStatuses },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw new ChatCallError("A call is already active in this conversation", {
        status: 409,
        code: "CHAT_CALL_ALREADY_ACTIVE",
        details: { call: toCallPayload(existing) },
      });
    }

    const record = await ChatCall.create({
      appName,
      conversationId,
      callId,
      provider: "internal_webrtc",
      type,
      status: "ringing",
      startedByUserId: String(actor.id),
      startedAt: new Date(),
      metadata: { startedBy: actor },
    }, { transaction });
    return toCallPayload(record);
  });
};

const getRingingCall = async ({ appName, conversationId, callId }) => {
  const record = await ChatCall.findOne({
    where: {
      appName,
      conversationId,
      callId: String(callId),
      status: "ringing",
    },
  });
  if (!record) {
    throw new ChatCallError("Ringing call not found", {
      status: 404,
      code: "CHAT_CALL_NOT_FOUND",
    });
  }
  return record;
};

export const respondToRingingCall = async ({
  appName,
  conversationId,
  callId,
  actor,
  action,
}) => {
  const record = await getRingingCall({ appName, conversationId, callId });
  if (String(record.startedByUserId) === String(actor.id)) {
    throw new ChatCallError(
      "The caller cannot accept or decline their own call",
      {
        status: 403,
        code: "CHAT_CALL_SELF_RESPONSE_FORBIDDEN",
      },
    );
  }

  if (action === "decline") {
    const [updated] = await ChatCall.update(
      {
        status: "declined",
        endedAt: new Date(),
        metadata: { ...(record.metadata || {}), declinedBy: actor },
      },
      { where: { id: record.id, status: "ringing" } },
    );
    if (!updated)
      throw new ChatCallError("This call was already answered", {
        status: 409,
        code: "CHAT_CALL_ALREADY_ANSWERED",
      });
    await record.reload();
    return toCallPayload(record, { declinedBy: actor });
  }
  if (action !== "accept") {
    throw new ChatCallError("action must be accept or decline", {
      code: "CHAT_CALL_RESPONSE_INVALID",
    });
  }

  const [claimed] = await ChatCall.update(
    {
      status: "accepted",
      metadata: {
        ...(record.metadata || {}),
        acceptedBy: actor,
        acceptedAt: new Date().toISOString(),
      },
    },
    { where: { id: record.id, status: "ringing" } },
  );
  if (!claimed)
    throw new ChatCallError("This call was already answered", {
      status: 409,
      code: "CHAT_CALL_ALREADY_ANSWERED",
    });
  await record.reload();
  return toCallPayload(record);
};

export const markCallMissed = async ({
  appName,
  conversationId,
  callId,
  unavailableUserIds = [],
}) => {
  const record = await getRingingCall({ appName, conversationId, callId });
  await record.update({
    status: "missed",
    endedAt: new Date(),
    metadata: {
      ...(record.metadata || {}),
      endReason: "recipient_unavailable",
      unavailableUserIds: unavailableUserIds.map(String),
    },
  });
  return toCallPayload(record);
};

export const finishCall = async ({
  appName,
  conversationId,
  callId,
  actorId,
}) => {
  const record = await ChatCall.findOne({
    where: {
      appName,
      conversationId,
      callId: String(callId),
      status: { [Op.in]: activeStatuses },
    },
  });
  if (!record)
    throw new ChatCallError("Active call not found", {
      status: 404,
      code: "CHAT_CALL_NOT_FOUND",
    });

  if (record.status === "connecting") {
    throw new ChatCallError("The call is currently being answered", {
      status: 409,
      code: "CHAT_CALL_CONNECTING",
    });
  }

  if (record.status === "ringing") {
    if (String(record.startedByUserId) !== String(actorId)) {
      throw new ChatCallError("Only the caller can cancel a ringing call", {
        status: 403,
        code: "CHAT_CALL_CANCEL_FORBIDDEN",
      });
    }
    const [updated] = await ChatCall.update(
      { status: "cancelled", endedAt: new Date() },
      { where: { id: record.id, status: "ringing" } },
    );
    if (!updated)
      throw new ChatCallError("This call was already answered", {
        status: 409,
        code: "CHAT_CALL_ALREADY_ANSWERED",
      });
    await record.reload();
    return toCallPayload(record);
  }

  const [updated] = await ChatCall.update(
    { status: "ended", endedAt: new Date() },
    { where: { id: record.id, status: record.status } },
  );
  if (!updated)
    throw new ChatCallError("This call was already ended", {
      status: 409,
      code: "CHAT_CALL_ALREADY_ENDED",
    });
  await record.reload();
  return toCallPayload(record);
};
