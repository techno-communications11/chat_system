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

const normalizeAssetUrl = (value) => {
  const url = String(value || "").trim();

  if (!url) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;

  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl && url.startsWith("/")) {
    return `${apiUrl.replace(/\/$/, "")}${url}`;
  }

  return url;
};

export const getImageUrl = (item) =>
  normalizeAssetUrl(
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
      "",
  );

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
    0;

  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const normalizeChatError = (error) => {
  const details = error?.response?.data?.details;
  const detailText =
    typeof details === "string"
      ? details
      : details
      ? JSON.stringify(details)
      : "";

  return (
    [error?.response?.data?.message, detailText].filter(Boolean).join(": ") ||
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

const getFileUrl = (file) =>
  file?.url ||
  file?.fileUrl ||
  file?.file_url ||
  file?.downloadUrl ||
  file?.download_url ||
  file?.publicUrl ||
  file?.public_url ||
  "";

export const getMessageAttachments = (message) => {
  const metadata = message?.metadata || {};
  const content = message?.content || {};
  const candidates = [
    metadata.file,
    metadata.attachment,
    content.file,
    content.attachment,
    ...(Array.isArray(metadata.files) ? metadata.files : []),
    ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
    ...(Array.isArray(content.files) ? content.files : []),
    ...(Array.isArray(content.attachments) ? content.attachments : []),
  ].filter(Boolean);

  if (metadata.type === "file" && candidates.length === 0) {
    candidates.push(metadata);
  }

  return candidates.map((file, index) => {
    const name =
      file.name ||
      file.fileName ||
      file.file_name ||
      file.originalName ||
      file.original_name ||
      content.file_name ||
      message?.file_name ||
      "Document";

    return {
      id: file.id || file.key || getFileUrl(file) || `${name}-${index}`,
      name,
      url: getFileUrl(file),
      size: file.size || file.contentLength || file.content_length || metadata.contentLength,
      contentType:
        file.contentType ||
        file.content_type ||
        file.mimeType ||
        file.mime_type ||
        metadata.contentType ||
        "",
    };
  });
};

export const getMessageSenderId = (message) => {
  const sender = message?.sender || message?.from || message?.user || {};

  if (typeof sender === "string" || typeof sender === "number") {
    return String(sender);
  }

  return String(
      message?.senderId ||
      message?.sender_id ||
      message?.senderIdentityId ||
      message?.sender_identity_id ||
      sender?.appUserId ||
      sender?.app_user_id ||
      sender?.userId ||
      sender?.id ||
      sender?.user_id ||
      sender?.chatIdentityId ||
      sender?.email_id ||
      sender?.mailid ||
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

export const formatMessageTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getMessageDayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const formatMessageDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfMessageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDifference = Math.round(
    (startOfToday - startOfMessageDay) / (24 * 60 * 60 * 1000),
  );

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
};

const normalizeMessageReactions = (reactions = [], currentUserId = "") => {
  const reactionsByEmoji = new Map();

  reactions.forEach((reaction) => {
    const emoji = reaction?.emoji;
    if (!emoji) return;

    const reactionUserId = String(
      reaction?.userId ||
        reaction?.user_id ||
        reaction?.chatIdentityId ||
        reaction?.chat_identity_id ||
        "",
    );
    const existing = reactionsByEmoji.get(emoji) || {
      emoji,
      count: 0,
      reacted: false,
      users: [],
    };

    reactionsByEmoji.set(emoji, {
      ...existing,
      count: existing.count + (Number(reaction?.count) || 1),
      reacted:
        existing.reacted ||
        Boolean(reaction?.reacted) ||
        Boolean(currentUserId && reactionUserId === String(currentUserId)),
      users: reactionUserId ? [...existing.users, reactionUserId] : existing.users,
    });
  });

  return Array.from(reactionsByEmoji.values());
};

export const normalizeChatMessages = (payload, selectedChat) => {
  const messages = getArrayPayload(payload?.messages ? payload.messages : payload);
  const selectedId = String(selectedChat?.id || "");
  const currentUserId = String(selectedChat?.currentUserId || "");

  return messages
    .map((message, index) => {
      const senderId = getMessageSenderId(message);
      const text = getMessageText(message);
      const attachments = getMessageAttachments(message);
      const direction =
        senderId && currentUserId
          ? senderId === currentUserId
            ? "outbound"
            : "inbound"
          : message?.direction ||
            (senderId && selectedId && senderId === selectedId ? "inbound" : "outbound");

      return {
        id:
          message?.message_id ||
          message?.id ||
          `${getMessageTime(message)}-${index}`,
        chatId: message?.chatId || message?.chat_id || message?.conversationId || null,
        chat_id: message?.chat_id || message?.chatId || message?.conversationId || null,
        text: text || (attachments.length ? "" : "[Unsupported message]"),
        sentAt: getMessageTime(message),
        timestamp: formatMessageTime(getMessageTime(message)),
        authorId: senderId,
        authorName:
          message?.sender?.name ||
          message?.sender?.display_name ||
          message?.sender?.displayName ||
          message?.sender?.email ||
          "Chat user",
        authorAvatarUrl: getImageUrl(message?.sender),
        direction,
        deliveryStatus:
          message?.deliveryStatus ||
          message?.delivery_status ||
          (direction === "outbound" ? "sent" : undefined),
        reactions: normalizeMessageReactions(message?.reactions || [], currentUserId),
        metadata: message?.metadata || {},
        mentions: message?.metadata?.mentions || message?.mentions || [],
        replyTo: message?.replyTo || message?.reply_to || message?.replyToMessageId || null,
        edited: Boolean(message?.metadata?.edited || message?.edited),
        editedAt: message?.metadata?.editedAt || message?.editedAt || null,
        attachments,
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
