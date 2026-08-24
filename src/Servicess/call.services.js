import crypto from "crypto";
import { Op } from "sequelize";
import ChatIdentity from "../modules/chatIdentity.module.js";
import ChatConversationParticipant from "../modules/chatConversationParticipant.module.js";
import ChatCall from "../modules/chatCall.module.js";
import { writeChatAuditLog } from "./chatAudit.services.js";
import {
  createRingingCall,
  finishCall,
  markCallMissed,
  respondToRingingCall,
  expireStaleCalls,
  toCallPayload,
} from "./chatCallLifecycle.services.js";
import {
  notifyConversationCall,
  isUserConnected,
} from "../realtime/chatSocket.js";
import { sendChatMessage } from "./message.services.js";
import {
  ensureLocalIdentity,
  getConversationForMember,
  getCallDurationSeconds,
  getCallHistoryText,
  normalizeCallType,
  provider,
} from "../helpers/chat.helpers.js";

const addCallHistoryMessage = async ({
  actor,
  conversationId,
  call,
  actorName,
}) => {
  try {
    await sendChatMessage({
      actor,
      chatId: conversationId,
      text: getCallHistoryText(call, actorName || "A participant"),
      metadata: {
        kind: "call_history",
        callHistory: {
          callId: call.id,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          durationSeconds: getCallDurationSeconds(call),
        },
      },
    });
  } catch (error) {
    console.error("Unable to store call history message", error.message);
  }
};

const publishCallEffects = ({
  actor,
  conversationId,
  call,
  participantUserIds,
  event,
  auditAction,
  actorName,
}) => {
  void Promise.allSettled([
    writeChatAuditLog({
      appName: actor.appName,
      appUserId: actor.appUserId,
      provider,
      action: auditAction,
      targetChatId: conversationId,
      metadata: call,
    }),
    notifyConversationCall({
      appName: actor.appName,
      conversationId,
      call,
      participantUserIds,
      event,
    }),
    addCallHistoryMessage({ actor, conversationId, call, actorName }),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Call side effect failed", result.reason?.message);
      }
    }
  });
};

export const startChatCall = async ({ actor, chatId, type }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const callType = normalizeCallType(type);
  const callId = crypto.randomUUID();
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
  });
  const callerUserId = String(identity.appUserId);
  const recipients = participants.filter(
    (participant) =>
      participant.identity?.appUserId &&
      String(participant.identity.appUserId) !== callerUserId,
  );
  const deliveryStates = await Promise.all(
    recipients.map(async (participant) => {
      const userId = String(participant.identity.appUserId);
      const presence = String(
        participant.identity.metadata?.presence ||
          participant.identity.metadata?.status ||
          "online",
      ).toLowerCase();
      const connected = await isUserConnected(actor.appName, userId);
      const memberConversations = await ChatConversationParticipant.findAll({
        where: { chatIdentityId: participant.chatIdentityId },
        attributes: ["conversationId"],
      });
      const activeCall =
        memberConversations.length > 0
          ? await ChatCall.findOne({
              where: {
                appName: actor.appName,
                conversationId: {
                  [Op.in]: memberConversations.map(
                    (item) => item.conversationId,
                  ),
                },
                status: { [Op.in]: ["ringing", "connecting", "accepted"] },
              },
              attributes: ["id"],
            })
          : null;
      return {
        userId,
        presence,
        connected,
        inAnotherCall: Boolean(activeCall),
        canRing:
          connected &&
          !activeCall &&
          !["busy", "dnd", "offline"].includes(presence),
      };
    }),
  );
  const ringingUserIds = deliveryStates
    .filter((item) => item.canRing)
    .map((item) => item.userId);
  const unavailableUserIds = deliveryStates
    .filter((item) => !item.canRing)
    .map((item) => item.userId);
  let call = await createRingingCall({
    appName: actor.appName,
    conversationId: conversation.id,
    callId,
    type: callType,
    actor: {
      id: String(identity.appUserId || ""),
      name:
        identity.providerDisplayName ||
        actor.displayName ||
        actor.appUserEmail ||
        "Chat user",
      email: identity.providerEmail || actor.appUserEmail || "",
    },
  });
  if (ringingUserIds.length === 0)
    call = await markCallMissed({
      appName: actor.appName,
      conversationId: conversation.id,
      callId,
      unavailableUserIds,
    });
  call.delivery = {
    ringing: ringingUserIds.length,
    unavailable: unavailableUserIds.length,
  };
  publishCallEffects({
    actor,
    conversationId: conversation.id,
    call,
    participantUserIds:
      call.status === "missed"
        ? [callerUserId]
        : [...new Set([callerUserId, ...ringingUserIds])],
    event: call.status === "missed" ? "call:missed" : "call:ringing",
    auditAction: call.status === "missed" ? "missed_call" : "ring_call",
    actorName: call.startedBy?.name,
  });
  return call;
};

export const listActiveChatCalls = async ({ actor }) => {
  const identity = await ensureLocalIdentity(actor);
  const memberships = await ChatConversationParticipant.findAll({
    where: { chatIdentityId: identity.id },
    attributes: ["conversationId"],
  });
  const conversationIds = memberships.map((item) => item.conversationId);
  if (conversationIds.length === 0) return [];
  for (const conversationId of conversationIds)
    await expireStaleCalls({ appName: actor.appName, conversationId });
  const calls = await ChatCall.findAll({
    where: {
      appName: actor.appName,
      conversationId: { [Op.in]: conversationIds },
      status: ["ringing", "connecting", "accepted"],
    },
    order: [["startedAt", "DESC"]],
  });
  return calls.map((call) => toCallPayload(call));
};

export const respondChatCall = async ({ actor, chatId, callId, action }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
  });
  const participantUserIds = participants
    .map((item) => item.identity?.appUserId)
    .filter(Boolean);
  const call = await respondToRingingCall({
    appName: actor.appName,
    conversationId: conversation.id,
    callId,
    action: String(action || "").toLowerCase(),
    actor: {
      id: String(identity.appUserId),
      name:
        identity.providerDisplayName ||
        actor.displayName ||
        actor.appUserEmail ||
        "Chat user",
      email: identity.providerEmail || actor.appUserEmail || "",
    },
  });
  publishCallEffects({
    actor,
    conversationId: conversation.id,
    call,
    participantUserIds,
    event: `call:${call.status}`,
    auditAction: `call_${call.status}`,
    actorName:
      identity.providerDisplayName || actor.displayName || actor.appUserEmail,
  });
  return call;
};

export const endChatCall = async ({ actor, chatId, callId }) => {
  const identity = await ensureLocalIdentity(actor);
  const conversation = await getConversationForMember({
    chatId,
    identityId: identity.id,
    appName: actor.appName,
  });
  const participants = await ChatConversationParticipant.findAll({
    where: { conversationId: conversation.id },
    include: [{ model: ChatIdentity, as: "identity" }],
  });
  const participantUserIds = participants
    .map((participant) => participant.identity?.appUserId)
    .filter(Boolean);
  const call = await finishCall({
    appName: actor.appName,
    conversationId: conversation.id,
    callId,
    actorId: identity.appUserId,
  });
  call.endedBy = {
    id: String(identity.appUserId || ""),
    name:
      identity.providerDisplayName ||
      actor.displayName ||
      actor.appUserEmail ||
      "Chat user",
    email: identity.providerEmail || actor.appUserEmail || "",
  };
  publishCallEffects({
    actor,
    conversationId: conversation.id,
    call,
    participantUserIds,
    event: `call:${call.status}`,
    auditAction: call.status === "cancelled" ? "cancel_call" : "end_call",
    actorName: call.endedBy.name,
  });
  return call;
};
