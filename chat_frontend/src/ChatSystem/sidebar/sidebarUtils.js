import {
  getAvailability,
  getBuddyEmail,
  getMessageText,
} from "../chatHelpers";

export const appRailItems = [{ key: "conversations", label: "All conversations" }];

export const statusOptions = [
  { value: "online", label: "Online", color: "#22c55e" },
  { value: "away", label: "Away", color: "#f59e0b" },
  { value: "busy", label: "Busy", color: "#ef4444" },
  { value: "offline", label: "Offline", color: "#9aa3af" },
];

export const getInitial = (value) =>
  String(value || "Z").trim().charAt(0).toUpperCase();

export const getCurrentUserName = (currentUser) =>
  currentUser?.name ||
  currentUser?.displayName ||
  currentUser?.username ||
  currentUser?.email ||
  "Current user";

export const isDirectConversation = (item, isChannel) =>
  !isChannel ||
  item?.isDirect ||
  item?.type === "direct" ||
  item?.conversationType === "direct";

export const getParticipantCount = (item) => {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const count = item?.participantCount || item?.participant_count || participants.length;
  return Number(count) || 0;
};

export const getLastMessagePreview = (item, isChannel) => {
  const rawLastMessage =
    item?.lastMessage ||
    item?.last_message ||
    item?.latestMessage ||
    item?.latest_message ||
    null;
  const text = getMessageText(rawLastMessage) || item?.lastMessageText || item?.last_message_text;

  if (text) return text;
  if (isChannel && !isDirectConversation(item, isChannel)) {
    return "No messages yet";
  }

  const availability = getAvailability(item);
  return availability?.label || getBuddyEmail(item) || "Direct message";
};

export const getDeliveryState = (item) =>
  String(
    item?.deliveryState ||
      item?.delivery_state ||
      item?.messageStatus ||
      item?.message_status ||
      item?.lastMessage?.status ||
      item?.last_message?.status ||
      "",
  ).toLowerCase();
