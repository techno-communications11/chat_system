export const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.buddies)) return payload.buddies;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.contacts)) return payload.contacts;
  if (Array.isArray(payload?.channels)) return payload.channels;
  if (Array.isArray(payload?.groups)) return payload.groups;
  if (Array.isArray(payload?.conversations)) return payload.conversations;
  if (Array.isArray(payload?.chats)) return payload.chats;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
};

export const getBuddyEmail = (buddy) =>
  buddy?.email ||
  buddy?.email_id ||
  buddy?.mailid ||
  buddy?.primary_email ||
  buddy?.emailid ||
  buddy?.user_id ||
  buddy?.id ||
  "";

export const getBuddySendId = (buddy) =>
  buddy?.user_id ||
  buddy?.id ||
  getBuddyEmail(buddy);

export const getBuddyName = (buddy) =>
  buddy?.name ||
  buddy?.display_name ||
  buddy?.full_name ||
  buddy?.first_name ||
    getBuddyEmail(buddy) ||
  "Chat User";

export const getImageUrl = (item) =>
  item?.avatarUrl ||
  item?.imageUrl ||
  item?.profilePicture ||
  item?.profile_picture ||
  item?.picture ||
  item?.photo ||
  item?.image_url ||
  item?.photo_url ||
  item?.profile_image ||
  item?.profile_image_url ||
  item?.avatar_url ||
  item?.thumbnail_url ||
  item?.icon_url ||
  item?.image ||
  "";

const pickStatusValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "available" : "unavailable";

  if (typeof value === "object") {
    return (
      value.status ||
      value.state ||
      value.label ||
      value.text ||
      value.name ||
      value.availability ||
      value.presence ||
      value.value ||
      ""
    );
  }

  return "";
};

export const getAvailability = (item) => {
  const rawStatus = [
    item?.availability,
    item?.availability_status,
    item?.availabilityStatus,
    item?.presence,
    item?.presence_status,
    item?.presenceStatus,
    item?.status,
    item?.status_message,
    item?.statusMessage,
    item?.user_status,
    item?.userStatus,
    item?.connection_status,
    item?.connectionStatus,
    item?.chat_status,
    item?.chatStatus,
    item?.online_status,
    item?.onlineStatus,
    item?.state,
    item?.mode,
  ].map(pickStatusValue).find(Boolean) || "";
  const status = String(rawStatus).toLowerCase();

  const booleanAvailability =
    item?.is_available ??
    item?.isAvailable ??
    item?.is_online ??
    item?.isOnline ??
    item?.online;

  if (booleanAvailability === true) {
    return { label: "Available", color: "#22c55e" };
  }
  if (booleanAvailability === false) {
    return { label: "Unavailable", color: "#9aa3af" };
  }

  if (
    status.includes("online") ||
    status.includes("available") ||
    status.includes("free") ||
    status === "active" ||
    status === "1"
  ) {
    return { label: "Available", color: "#22c55e" };
  }
  if (
    status.includes("busy") ||
    status.includes("dnd") ||
    status.includes("do not disturb")
  ) {
    return { label: "Busy", color: "#ef4444" };
  }
  if (
    status.includes("away") ||
    status.includes("idle") ||
    status.includes("break")
  ) {
    return { label: "Away", color: "#f59e0b" };
  }

  return { label: "Unknown", color: "#9aa3af" };
};

export const getPhoneNumber = (item) =>
  item?.phone ||
  item?.mobile ||
  item?.mobile_number ||
  item?.phone_number ||
  item?.contact_number ||
  "";

export const getChannelId = (channel) =>
  channel?.unique_name ||
  channel?.uniqueName ||
  channel?.channel_id ||
  channel?.chat_id ||
  channel?.group_id ||
  channel?.groupId ||
  channel?.name ||
  channel?.groupName ||
  channel?.group_name ||
  channel?.id ||
  "";

export const getChannelName = (channel) =>
  channel?.name ||
  channel?.display_name ||
  channel?.groupName ||
  channel?.group_name ||
  channel?.title ||
  getChannelId(channel) ||
  "Group";

export const getUnreadCount = (item) => {
  const value =
    item?.unreadCount ??
    item?.unread_count ??
    item?.unread ??
    item?.unreadMessages ??
    0;

  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const normalizeChatError = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Chat request failed."
  );
};

export const getMessageText = (message) =>
  message?.content?.text ||
  message?.content?.message ||
  message?.content?.file_name ||
  message?.text ||
  message?.message ||
  "";

export const getMessageSenderId = (message) => {
  const sender = message?.sender || message?.from || message?.user || {};

  if (typeof sender === "string" || typeof sender === "number") {
    return String(sender);
  }

  return String(
      sender?.id ||
      sender?.user_id ||
      sender?.chatIdentityId ||
      sender?.email ||
      ""
  );
};

export const getMessageTime = (message) =>
  message?.time ||
  message?.created_time ||
  message?.sent_time ||
  message?.createdAt ||
  message?.timestamp ||
  new Date().toISOString();

export const normalizeChatMessages = (payload, selectedChat) => {
  const messages = getArrayPayload(payload?.messages ? payload.messages : payload);
  const selectedId = String(selectedChat?.id || "");
  const currentUserId = String(selectedChat?.currentUserId || "");

  return messages
    .map((message, index) => {
      const senderId = getMessageSenderId(message);
      const text = getMessageText(message);

      return {
        id:
          message?.message_id ||
          message?.id ||
          `${getMessageTime(message)}-${index}`,
        text: text || "[Unsupported message]",
        sentAt: getMessageTime(message),
        direction:
          message?.direction ||
          (senderId && currentUserId && senderId === currentUserId
            ? "outbound"
            : senderId && selectedId && senderId === selectedId
            ? "inbound"
            : "outbound"),
        reactions: message?.reactions || [],
        metadata: message?.metadata || {},
        mentions: message?.metadata?.mentions || message?.mentions || [],
      };
    })
    .sort((first, second) => new Date(first.sentAt) - new Date(second.sentAt));
};

export const normalizeRealtimeMessage = (message, selectedChat) => {
  const normalized = normalizeChatMessages([message], selectedChat);
  return normalized[0] || null;
};

export const resolveLocalChatKey = ({
  chatId,
  channels = [],
  buddies = [],
  currentUserId = "",
}) => {
  const normalizedChatId = String(chatId || "");

  const channelMatch = channels.find(
    (channel) => String(getChannelId(channel)) === normalizedChatId,
  );
  if (channelMatch) {
    return getChannelId(channelMatch);
  }

  const directConversation = channels.find((channel) => {
    const conversationId = String(
      channel?.chat_id || channel?.chatId || channel?.id || "",
    );
    return conversationId === normalizedChatId && channel?.isDirect;
  });

  if (directConversation?.participants?.length) {
    const otherParticipant = directConversation.participants.find(
      (participant) => String(participant?.id || participant?.user_id || "") !== String(currentUserId),
    );

    if (otherParticipant) {
      return String(otherParticipant.id || otherParticipant.user_id || "");
    }
  }

  const buddyMatch = buddies.find(
    (buddy) => String(getBuddySendId(buddy)) === normalizedChatId,
  );
  if (buddyMatch) {
    return getBuddySendId(buddyMatch);
  }

  return normalizedChatId;
};
