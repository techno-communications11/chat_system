import ChatCall from "../modules/chatCall.module.js";
import { createMeeting, endMeeting } from "./googleMeet.services.js";

export class ChatCallError extends Error {
  constructor(message, { status = 400, code = "CHAT_CALL_INVALID", details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const activeStatuses = ["ringing", "connecting", "accepted"];
const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const staleAfterMs = {
  ringing: positiveNumber(process.env.CHAT_CALL_RING_TIMEOUT_MS, 2 * 60 * 1000),
  connecting: positiveNumber(process.env.CHAT_CALL_CONNECT_TIMEOUT_MS, 2 * 60 * 1000),
  accepted: positiveNumber(process.env.CHAT_CALL_MAX_DURATION_MS, 4 * 60 * 60 * 1000),
};

export const toCallPayload = (record, additions = {}) => ({
  id: record.callId,
  chatId: String(record.conversationId),
  type: record.type,
  status: record.status,
  provider: record.provider,
  providerSpaceName: record.providerSpaceName || undefined,
  callUrl: record.meetingUri || undefined,
  meetingCode: record.meetingCode || undefined,
  startedAt: record.startedAt,
  endedAt: record.endedAt || undefined,
  startedBy: {
    id: String(record.startedByUserId),
    ...(record.metadata?.startedBy || {}),
  },
  ...(record.metadata?.acceptedBy ? { acceptedBy: record.metadata.acceptedBy } : {}),
  ...additions,
});

// A browser can close before it sends the end event. Retire abandoned rows so
// one lost event cannot permanently block every future call in a conversation.
export const expireStaleCalls = async ({ appName, conversationId, now = new Date() }) => {
  const records = await ChatCall.findAll({
    where: { appName, conversationId, status: activeStatuses },
  });

  for (const record of records) {
    const lastActivity = new Date(record.updatedAt || record.startedAt).getTime();
    if (now.getTime() - lastActivity < staleAfterMs[record.status]) continue;

    const previousStatus = record.status;
    const terminalStatus = previousStatus === "accepted" ? "ended" : "failed";
    const [updated] = await ChatCall.update(
      {
        status: terminalStatus,
        endedAt: now,
        metadata: { ...(record.metadata || {}), endReason: "timeout" },
      },
      { where: { id: record.id, status: previousStatus } },
    );

    if (updated && previousStatus === "accepted" && record.providerSpaceName) {
      await endMeeting(record.providerSpaceName).catch(() => {});
    }
  }
};

export const createRingingCall = async ({ appName, conversationId, callId, type, actor }) => {
  await expireStaleCalls({ appName, conversationId });
  const existing = await ChatCall.findOne({
    where: { appName, conversationId, status: activeStatuses },
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
    provider: "google_meet",
    type,
    status: "ringing",
    startedByUserId: String(actor.id),
    startedAt: new Date(),
    metadata: { startedBy: actor },
  });
  return toCallPayload(record);
};

const getRingingCall = async ({ appName, conversationId, callId }) => {
  const record = await ChatCall.findOne({
    where: { appName, conversationId, callId: String(callId), status: "ringing" },
  });
  if (!record) {
    throw new ChatCallError("Ringing call not found", { status: 404, code: "CHAT_CALL_NOT_FOUND" });
  }
  return record;
};

export const respondToRingingCall = async ({ appName, conversationId, callId, actor, action }) => {
  const record = await getRingingCall({ appName, conversationId, callId });
  if (String(record.startedByUserId) === String(actor.id)) {
    throw new ChatCallError("The caller cannot accept or decline their own call", {
      status: 403,
      code: "CHAT_CALL_SELF_RESPONSE_FORBIDDEN",
    });
  }

  if (action === "decline") {
    const [updated] = await ChatCall.update(
      { status: "declined", endedAt: new Date(), metadata: { ...(record.metadata || {}), declinedBy: actor } },
      { where: { id: record.id, status: "ringing" } },
    );
    if (!updated) throw new ChatCallError("This call was already answered", { status: 409, code: "CHAT_CALL_ALREADY_ANSWERED" });
    await record.reload();
    return toCallPayload(record, { declinedBy: actor });
  }
  if (action !== "accept") {
    throw new ChatCallError("action must be accept or decline", { code: "CHAT_CALL_RESPONSE_INVALID" });
  }

  const [claimed] = await ChatCall.update(
    { status: "connecting" },
    { where: { id: record.id, status: "ringing" } },
  );
  if (!claimed) throw new ChatCallError("This call was already answered", { status: 409, code: "CHAT_CALL_ALREADY_ANSWERED" });
  try {
    const meeting = await createMeeting();
    await record.update({
      status: "accepted",
      providerSpaceName: meeting.name,
      meetingUri: meeting.meetingUri,
      meetingCode: meeting.meetingCode,
      metadata: { ...(record.metadata || {}), acceptedBy: actor, acceptedAt: new Date().toISOString() },
    });
  } catch (error) {
    await ChatCall.update({ status: "ringing" }, { where: { id: record.id, status: "connecting" } });
    throw error;
  }
  return toCallPayload(record);
};

export const markCallMissed = async ({ appName, conversationId, callId, unavailableUserIds = [] }) => {
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

export const finishCall = async ({ appName, conversationId, callId, actorId }) => {
  const record = await ChatCall.findOne({
    where: { appName, conversationId, callId: String(callId), status: activeStatuses },
  });
  if (!record) throw new ChatCallError("Active call not found", { status: 404, code: "CHAT_CALL_NOT_FOUND" });

  if (record.status === "connecting") {
    throw new ChatCallError("The call is currently being answered", { status: 409, code: "CHAT_CALL_CONNECTING" });
  }

  if (record.status === "ringing") {
    if (String(record.startedByUserId) !== String(actorId)) {
      throw new ChatCallError("Only the caller can cancel a ringing call", {
        status: 403,
        code: "CHAT_CALL_CANCEL_FORBIDDEN",
      });
    }
    await record.update({ status: "cancelled", endedAt: new Date() });
    return toCallPayload(record);
  }

  await endMeeting(record.providerSpaceName);
  await record.update({ status: "ended", endedAt: new Date() });
  return toCallPayload(record);
};
