import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getMessageSenderId,
  getMessageText,
  getUnreadCount,
  normalizeChatMessages,
  normalizeChatError,
  normalizeRealtimeMessage,
  resolveLocalChatKey,
} from "./chatHelpers";
import {
  requestChatNotificationPermission,
  showChatNotification,
} from "./chatNotifications";
import { useChatRealtime } from "./useChatRealtime";
import IncomingCallDialog from "./calls/IncomingCallDialog";
import { useCallTone } from "./calls/useCallTone";
import {
  getChatMessagesService,
  getChatStatusService,
  getChatUsersService,
  getChatConversationsService,
  addGroupMembersService,
  addMessageReactionService,
  createGroupChatService,
  editConversationMessageService,
  leaveGroupConversationService,
  markConversationReadService,
  openDirectChatService,
  pinConversationMessageService,
  removeMessageReactionService,
  sendConversationMessageService,
  sendDirectMessageService,
  shareConversationFileService,
  startConversationCallService,
  endConversationCallService,
  respondConversationCallService,
  updateChatAvatarService,
  updateChatStatusService,
} from "../Services/chat.services";
import { getTokenUser } from "../utils/authToken";

export default function ChatSystem({ standalone = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const chatBoxRef = useRef(null);
  const initialFetchStartedRef = useRef(false);
  const loadedChatHistoryRef = useRef(new Set());
  const readConversationKeysRef = useRef(new Set());
  const handledRealtimeMessageKeysRef = useRef(new Set());
  const openedMeetCallIdsRef = useRef(new Set());

  const [, setTab] = useState("conversations");
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupUserIds, setGroupUserIds] = useState([]);
  const [groupError, setGroupError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [addMemberUserIds, setAddMemberUserIds] = useState([]);
  const [addMembersError, setAddMembersError] = useState("");
  const [addingMembers, setAddingMembers] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("online");
  const [statusSaving, setStatusSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStarting, setCallStarting] = useState(false);
  const [callResponding, setCallResponding] = useState(false);
  const [callError, setCallError] = useState("");
  const [callNotice, setCallNotice] = useState("");
  useCallTone(incomingCall ? "incoming" : activeCall?.status === "ringing" ? "outgoing" : null);
  const [mutedGroupIds, setMutedGroupIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_muted_group_ids") || "[]");
    } catch {
      return [];
    }
  });
  const [profileUser, setProfileUser] = useState(() => {
    const tokenUser = getTokenUser();

    if (tokenUser) return tokenUser;

    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const currentUser = profileUser;
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || ""
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();

  const isCurrentUserRecord = useCallback(
    (item) => {
      const itemId = String(getBuddySendId(item) || "");
      const itemEmail = String(getBuddyEmail(item) || "").toLowerCase();

      return (
        (currentUserId && itemId === currentUserId) ||
        (currentUserEmail && itemEmail === currentUserEmail)
      );
    },
    [currentUserEmail, currentUserId],
  );

  const getUserIdentityKey = useCallback((user) => {
    const email = String(
      user?.email ||
        user?.email_id ||
        user?.mailid ||
        user?.primary_email ||
        user?.emailid ||
        "",
    )
      .trim()
      .toLowerCase();

    if (email && email.includes("@")) return `email:${email}`;

    const name = String(getBuddyName(user)).trim().toLowerCase();
    if (name && name !== "chat user") return `name:${name}`;

    return `id:${String(getBuddySendId(user) || "").trim().toLowerCase()}`;
  }, []);

  const getUserMergeScore = useCallback((user) => {
    let score = 0;
    if (getImageUrl(user)) score += 8;
    if (user?.directConversationId || user?.chat_id || user?.chatId) score += 6;
    if (getUnreadCount(user) > 0) score += 4;
    if (String(getBuddyEmail(user)).includes("@")) score += 2;
    if (getBuddyName(user) && getBuddyName(user) !== "Chat User") score += 1;
    return score;
  }, []);

  const mergeUserRecords = useCallback((first, second) => {
    if (!first) return second;
    if (!second) return first;

    const preferred = getUserMergeScore(second) >= getUserMergeScore(first) ? second : first;
    const fallback = preferred === second ? first : second;
    const preferredImage = getImageUrl(preferred);
    const fallbackImage = getImageUrl(fallback);

    return {
      ...fallback,
      ...preferred,
      id: getBuddySendId(preferred) || getBuddySendId(fallback),
      user_id: getBuddySendId(preferred) || getBuddySendId(fallback),
      email: String(getBuddyEmail(preferred)).includes("@")
        ? getBuddyEmail(preferred)
        : getBuddyEmail(fallback),
      name: getBuddyName(preferred) || getBuddyName(fallback),
      display_name: preferred.display_name || preferred.name || fallback.display_name || fallback.name,
      avatarUrl: preferredImage || fallbackImage,
      imageUrl: preferredImage || fallbackImage,
      unreadCount: Math.max(getUnreadCount(first), getUnreadCount(second)),
      unread_count: Math.max(getUnreadCount(first), getUnreadCount(second)),
    };
  }, [getUserMergeScore]);

  const uniqueUsersByIdentity = useCallback(
    (users = []) => {
      const usersByKey = new Map();

      users.forEach((user) => {
        const key = getUserIdentityKey(user);
        if (!key || key === "id:") return;
        usersByKey.set(key, mergeUserRecords(usersByKey.get(key), user));
      });

      return Array.from(usersByKey.values());
    },
    [getUserIdentityKey, mergeUserRecords],
  );

  const isSelfConversation = useCallback(
    (conversation) => {
      const participants = Array.isArray(conversation?.participants)
        ? conversation.participants
        : [];
      const isDirect =
        conversation?.isDirect ||
        conversation?.type === "direct" ||
        conversation?.conversationType === "direct";

      if (!isDirect) return false;
      if (participants.length > 0) {
        return participants.every((participant) => isCurrentUserRecord(participant));
      }

      const title = String(
        conversation?.title ||
          conversation?.name ||
          conversation?.display_name ||
          "",
      ).toLowerCase();

      return (
        title === "myself" ||
        title === "me" ||
        title === String(currentUser?.name || "").toLowerCase() ||
        (currentUserEmail && title === currentUserEmail)
      );
    },
    [currentUser?.name, currentUserEmail, isCurrentUserRecord],
  );

  const activeConversationId =
    selectedChat?.type === "channel"
      ? selectedChat.id
      : selectedChat?.chatId || null;

  const visibleBuddies = useMemo(
    () => uniqueUsersByIdentity(buddies.filter((buddy) => !isCurrentUserRecord(buddy))),
    [buddies, isCurrentUserRecord, uniqueUsersByIdentity],
  );
  const visibleChannels = useMemo(
    () => channels.filter((channel) => !isSelfConversation(channel)),
    [channels, isSelfConversation],
  );
  const visibleGroupChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          !channel?.isDirect &&
          channel?.type !== "direct" &&
          channel?.conversationType !== "direct",
      ),
    [visibleChannels],
  );
  const visibleDirectChannels = useMemo(
    () =>
      visibleChannels.filter(
        (channel) =>
          channel?.isDirect ||
          channel?.type === "direct" ||
          channel?.conversationType === "direct",
      ),
    [visibleChannels],
  );
  const conversationItems = useMemo(
    () => {
      const directRows = visibleBuddies.map((buddy) => {
        const buddyId = String(getBuddySendId(buddy));
        const buddyEmail = String(getBuddyEmail(buddy)).toLowerCase();
        const buddyName = String(getBuddyName(buddy)).trim().toLowerCase();
        const matchingDirectConversation = visibleDirectChannels.find((channel) => {
          const participants = Array.isArray(channel?.participants)
            ? channel.participants
            : [];

          return participants.some((participant) => {
            const participantId = String(getBuddySendId(participant));
            const participantEmail = String(getBuddyEmail(participant)).toLowerCase();
            const participantName = String(getBuddyName(participant)).trim().toLowerCase();
            return (
              (buddyId && participantId === buddyId) ||
              (buddyEmail && participantEmail === buddyEmail) ||
              (buddyName && participantName === buddyName)
            );
          });
        });

        return {
          ...(matchingDirectConversation || {}),
          ...buddy,
          directConversationId:
            matchingDirectConversation?.chat_id ||
            matchingDirectConversation?.chatId ||
            matchingDirectConversation?.id ||
            "",
          unreadCount: getUnreadCount(matchingDirectConversation) || getUnreadCount(buddy),
          lastMessage:
            matchingDirectConversation?.lastMessage ||
            matchingDirectConversation?.last_message ||
            buddy?.lastMessage ||
            buddy?.last_message,
          last_message:
            matchingDirectConversation?.last_message ||
            matchingDirectConversation?.lastMessage ||
            buddy?.last_message,
          lastMessageTime:
            matchingDirectConversation?.lastMessageTime ||
            matchingDirectConversation?.last_message_time ||
            buddy?.lastMessageTime ||
            buddy?.last_message_time,
          __conversationType: "person",
        };
      });

      return [
        ...directRows,
        ...visibleGroupChannels.map((channel) => ({
          ...channel,
          __conversationType: "channel",
        })),
      ];
    },
    [visibleBuddies, visibleDirectChannels, visibleGroupChannels],
  );
  const totalUnreadCount = useMemo(
    () => {
      const countsByConversation = new Map();

      conversationItems.forEach((item) => {
        const conversationKey =
          item?.directConversationId ||
          item?.chat_id ||
          item?.chatId ||
          getChannelId(item) ||
          getBuddySendId(item) ||
          getBuddyEmail(item);

        if (!conversationKey) return;

        const key = String(conversationKey);
        countsByConversation.set(
          key,
          Math.max(countsByConversation.get(key) || 0, getUnreadCount(item)),
        );
      });

      return Array.from(countsByConversation.values()).reduce(
        (total, count) => total + count,
        0,
      );
    },
    [conversationItems],
  );

  const handleRealtimeMessage = useCallback(
    ({ chatId, message }) => {
      if (!chatId || !message) return;

      const senderId = getMessageSenderId(message);
      const isOwnMessage = senderId && senderId === currentUserId;
      const messageId =
        message?.message_id ||
        message?.messageId ||
        message?.id ||
        message?.createdAt ||
        message?.timestamp ||
        "";
      const realtimeMessageKey = `${String(chatId)}:${String(messageId)}`;

      if (messageId && handledRealtimeMessageKeysRef.current.has(realtimeMessageKey)) {
        return;
      }

      if (messageId) {
        handledRealtimeMessageKeysRef.current.add(realtimeMessageKey);
      }

      const localKey = resolveLocalChatKey({
        chatId,
        channels,
        buddies,
        currentUserId,
      });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id,
        currentUserId,
      });

      if (!normalizedMessage) return;

      const isActiveChat =
        (selectedChat?.type === "channel" &&
          String(selectedChat.id) === String(chatId)) ||
        (selectedChat?.type === "person" &&
          String(selectedChat.chatId || "") === String(chatId));
      const shouldTreatAsRead = isActiveChat && !document.hidden;

      if (localKey) {
        setMessagesByChat((prev) => {
          const existing = prev[localKey] || [];
          if (
            existing.some(
              (item) => String(item.id) === String(normalizedMessage.id),
            )
          ) {
            return prev;
          }

          return {
            ...prev,
            [localKey]: [...existing, normalizedMessage],
          };
        });
      }

      setChannels((prev) => {
        let matchedExistingConversation = false;
        const nextChannels = prev.map((channel) => {
          const channelId = String(getChannelId(channel));
          const conversationId = String(
            channel?.chat_id || channel?.chatId || channel?.id || "",
          );

          if (channelId !== String(chatId) && conversationId !== String(chatId)) {
            return channel;
          }

          matchedExistingConversation = true;
          return {
            ...channel,
            unreadCount: shouldTreatAsRead || isOwnMessage ? 0 : getUnreadCount(channel) + 1,
            lastMessage: message,
          };
        });

        if (matchedExistingConversation || isOwnMessage) {
          return nextChannels;
        }

        const sender = message?.sender || {};
        const senderUser = {
          ...(typeof sender === "object" ? sender : {}),
          id: senderId,
          user_id: senderId,
          name:
            sender?.name ||
            sender?.display_name ||
            sender?.displayName ||
            buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.name ||
            "Chat user",
          email:
            sender?.email ||
            sender?.email_id ||
            buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.email ||
            "",
        };

        return [
          {
            id: String(chatId),
            chat_id: String(chatId),
            type: "direct",
            isDirect: true,
            title: senderUser.name,
            participants: [senderUser, currentUser].filter(Boolean),
            unreadCount: shouldTreatAsRead ? 0 : 1,
            unread_count: shouldTreatAsRead ? 0 : 1,
            lastMessage: message,
          },
          ...nextChannels,
        ];
      });

      if (!isOwnMessage && (!isActiveChat || document.hidden)) {
        if (mutedGroupIds.includes(String(chatId))) return;

        const senderName =
          message?.sender?.name ||
          message?.sender?.display_name ||
          buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.name ||
          "Someone";

        showChatNotification({
          title: senderName,
          body: getMessageText(message),
          icon: getImageUrl(message?.sender),
          tag: `chat-${chatId}`,
          onClick: () => {
            if (localKey) {
              navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
            }
          },
        });
      }

      if (shouldTreatAsRead && !isOwnMessage) {
        markConversationReadService(chatId).catch(() => {});
      }
    },
    [buddies, channels, currentUser, currentUserId, mutedGroupIds, navigate, selectedChat],
  );

  const handleRealtimeMessageUpdated = useCallback(
    ({ chatId, message }) => {
      if (!chatId || !message) return;

      const localKey = resolveLocalChatKey({
        chatId,
        channels,
        buddies,
        currentUserId,
      });
      const normalizedMessage = normalizeRealtimeMessage(message, {
        ...(selectedChat || {}),
        id: localKey || selectedChat?.id,
        currentUserId,
      });

      if (!localKey || !normalizedMessage) return;

      setMessagesByChat((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || []).map((item) =>
          String(item.id) === String(normalizedMessage.id)
            ? { ...item, ...normalizedMessage }
            : item,
        ),
      }));
    },
    [buddies, channels, currentUserId, selectedChat],
  );

  const handleRealtimeMessageRead = useCallback(
    ({ chatId, userId, readAt, readStates = [] }) => {
      if (!chatId || !readAt || String(userId) === currentUserId) return;
      const localKey = resolveLocalChatKey({ chatId, channels, buddies, currentUserId });
      if (!localKey) return;
      const otherReaders = readStates.filter(
        (reader) => reader.userId && String(reader.userId) !== currentUserId,
      );
      setMessagesByChat((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || []).map((message) => {
          if (message.direction !== "outbound" || otherReaders.length === 0) return message;
          const sentAt = new Date(message.sentAt).getTime();
          const seenByAll = otherReaders.every(
            (reader) => reader.readAt && new Date(reader.readAt).getTime() >= sentAt,
          );
          return seenByAll ? { ...message, deliveryStatus: "seen" } : message;
        }),
      }));
    },
    [buddies, channels, currentUserId],
  );

  const handleRealtimeReactionAdded = useCallback(
    ({ chatId, reaction, message }) => {
      const actorId = String(
        reaction?.actor?.id ||
          reaction?.actor?.userId ||
          reaction?.actor?.user_id ||
          reaction?.actor?.appUserId ||
          "",
      );
      const actorEmail = String(
        reaction?.actor?.email ||
          reaction?.actor?.email_id ||
          reaction?.actor?.mailid ||
          "",
      ).toLowerCase();
      if (
        !chatId ||
        !reaction?.emoji ||
        mutedGroupIds.includes(String(chatId)) ||
        (actorId && actorId === currentUserId) ||
        (actorEmail && actorEmail === currentUserEmail)
      ) {
        return;
      }

      const localKey = resolveLocalChatKey({
        chatId,
        channels,
        buddies,
        currentUserId,
      });
      const actorName =
        reaction?.actor?.name ||
        reaction?.actor?.display_name ||
        reaction?.actor?.email ||
        "Someone";
      const messagePreview = getMessageText(message);

      showChatNotification({
        title: `${actorName} reacted ${reaction.emoji}`,
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(reaction?.actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}`,
        onClick: () => {
          if (localKey) {
            navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
          }
        },
      });
    },
    [buddies, channels, currentUserEmail, currentUserId, mutedGroupIds, navigate],
  );

  const handleRealtimePresence = useCallback(({ userId, presence, user }) => {
    if (!userId) return;

    setBuddies((prev) =>
      prev.map((buddy) =>
        String(getBuddySendId(buddy)) === String(userId)
          ? {
              ...buddy,
              ...user,
              presence: presence || user?.presence,
              status: presence || user?.status,
            }
          : buddy,
      ),
    );
  }, []);

  const handleRealtimeAvatar = useCallback(({ userId, avatarUrl, user }) => {
    if (!userId) return;

    const nextAvatarUrl = avatarUrl || getImageUrl(user);

    setBuddies((prev) =>
      prev.map((buddy) =>
        String(getBuddySendId(buddy)) === String(userId)
          ? { ...buddy, ...user, avatarUrl: nextAvatarUrl, imageUrl: nextAvatarUrl }
          : buddy,
      ),
    );

    if (String(userId) === currentUserId) {
      setProfileUser((prev) => {
        const nextUser = {
          ...(prev || {}),
          ...(user || {}),
          avatarUrl: nextAvatarUrl,
          imageUrl: nextAvatarUrl,
        };
        localStorage.setItem("user", JSON.stringify(nextUser));
        return nextUser;
      });
    }
  }, [currentUserId]);

  const handleRealtimeCallRinging = useCallback(({ call }) => {
    if (!call?.id) return;
    if (String(call.startedBy?.id) === currentUserId) {
      setActiveCall(call);
      return;
    }
    setCallError("");
    setIncomingCall(call);
    showChatNotification({
      title: `Incoming ${call.type === "video" ? "video" : "audio"} call`,
      body: `${call.startedBy?.name || "A chat user"} is calling you`,
      tag: `chat-call-${call.id}`,
    });
  }, [currentUserId]);

  const openGoogleMeet = useCallback((call) => {
    if (!call?.id || !call?.callUrl || openedMeetCallIdsRef.current.has(call.id)) return;
    openedMeetCallIdsRef.current.add(call.id);
    window.location.assign(call.callUrl);
  }, []);

  const handleRealtimeCallAccepted = useCallback(({ call }) => {
    if (!call?.id) return;
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall(call);
    showChatNotification({ title: "Call accepted", body: "Your Google Meet room is ready.", tag: `chat-call-${call.id}` });
    openGoogleMeet(call);
  }, [openGoogleMeet]);

  const handleRealtimeCallClosed = useCallback(({ call }) => {
    if (!call?.id) return;
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
  }, []);

  const handleRealtimeCallDeclined = useCallback(({ call }) => {
    handleRealtimeCallClosed({ call });
    if (String(call?.startedBy?.id) === currentUserId) {
      showChatNotification({ title: "Call declined", body: "The other user declined your call.", tag: `chat-call-${call?.id}` });
    }
  }, [currentUserId, handleRealtimeCallClosed]);

  const handleRealtimeCallCancelled = useCallback(({ call }) => {
    handleRealtimeCallClosed({ call });
    if (String(call?.startedBy?.id) !== currentUserId) {
      showChatNotification({ title: "Call cancelled", body: `${call?.startedBy?.name || "The caller"} cancelled the call.`, tag: `chat-call-${call?.id}` });
    }
  }, [currentUserId, handleRealtimeCallClosed]);

  const handleRealtimeCallEnded = useCallback(({ call }) => {
    if (!call?.id) return;
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
  }, []);

  const handleRealtimeCallMissed = useCallback(({ call }) => {
    if (!call?.id) return;
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall((prev) => (prev?.id === call.id ? null : prev));
    setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
  }, []);

  useChatRealtime({
    enabled: Boolean(currentUserId),
    activeConversationId,
    onMessage: handleRealtimeMessage,
    onMessageUpdated: handleRealtimeMessageUpdated,
    onMessageRead: handleRealtimeMessageRead,
    onReactionAdded: handleRealtimeReactionAdded,
    onPresence: handleRealtimePresence,
    onAvatar: handleRealtimeAvatar,
    onCallStarted: handleRealtimeCallAccepted,
    onCallRinging: handleRealtimeCallRinging,
    onCallAccepted: handleRealtimeCallAccepted,
    onCallDeclined: handleRealtimeCallDeclined,
    onCallCancelled: handleRealtimeCallCancelled,
    onCallEnded: handleRealtimeCallEnded,
    onCallMissed: handleRealtimeCallMissed,
  });

  useEffect(() => {
    requestChatNotificationPermission().catch(() => {});
  }, []);

  const clearUnreadForChat = useCallback(({ chatId, userId, email } = {}) => {
    const normalizedChatId = String(chatId || "");
    const normalizedUserId = String(userId || "");
    const normalizedEmail = String(email || "").toLowerCase();

    if (normalizedChatId) readConversationKeysRef.current.add(`chat:${normalizedChatId}`);
    if (normalizedUserId) readConversationKeysRef.current.add(`user:${normalizedUserId}`);
    if (normalizedEmail) readConversationKeysRef.current.add(`email:${normalizedEmail}`);

    setChannels((prev) =>
      prev.map((item) => {
        const conversationId = String(item?.chat_id || item?.chatId || item?.id || "");
        const channelId = String(getChannelId(item) || "");
        const shouldClear =
          (normalizedChatId &&
            (conversationId === normalizedChatId || channelId === normalizedChatId)) ||
          (normalizedUserId &&
            Array.isArray(item?.participants) &&
            item.participants.some(
              (participant) =>
                String(getBuddySendId(participant)) === normalizedUserId ||
                String(getBuddyEmail(participant)).toLowerCase() === normalizedEmail,
            ));

        return shouldClear
          ? { ...item, unreadCount: 0, unread_count: 0, unread: 0, unreadMessages: 0 }
          : item;
      }),
    );

    setBuddies((prev) =>
      prev.map((buddy) => {
        const shouldClear =
          (normalizedUserId && String(getBuddySendId(buddy)) === normalizedUserId) ||
          (normalizedEmail && String(getBuddyEmail(buddy)).toLowerCase() === normalizedEmail);

        return shouldClear
          ? { ...buddy, unreadCount: 0, unread_count: 0, unread: 0, unreadMessages: 0 }
          : buddy;
      }),
    );

    setSelectedChat((prev) => {
      if (!prev) return prev;

      const shouldClear =
        (normalizedChatId &&
          (String(prev.id || "") === normalizedChatId ||
            String(prev.chatId || "") === normalizedChatId)) ||
        (normalizedUserId && String(prev.id || "") === normalizedUserId);

      return shouldClear
        ? {
            ...prev,
            raw: {
              ...(prev.raw || {}),
              unreadCount: 0,
              unread_count: 0,
              unread: 0,
              unreadMessages: 0,
            },
          }
        : prev;
    });
  }, []);

  const loadDirectChatHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "person" || !chat.id) return;

    loadedChatHistoryRef.current.add(chat.id);
    clearUnreadForChat({
      chatId: chat.chatId,
      userId: chat.id,
      email: chat.subtitle || getBuddyEmail(chat.raw),
    });

    try {
      const openResponse = await openDirectChatService(chat.id);
      const chatId =
        openResponse.data?.data?.chat_id ||
        openResponse.data?.data?.data?.chat_id ||
        null;

      if (!chatId) return;

      setSelectedChat((prev) =>
        prev?.id === chat.id ? { ...prev, chatId } : prev
      );
      clearUnreadForChat({
        chatId,
        userId: chat.id,
        email: chat.subtitle || getBuddyEmail(chat.raw),
      });

      await markConversationReadService(chatId);
      const messagesResponse = await getChatMessagesService(chatId);
      const normalizedMessages = normalizeChatMessages(
        messagesResponse.data?.data,
        chat
      );

      setMessagesByChat((prev) => ({
        ...prev,
        [chat.id]: normalizedMessages,
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  }, [clearUnreadForChat]);

  const loadChannelHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "channel" || !chat.id) return;

    loadedChatHistoryRef.current.add(chat.id);

    try {
      clearUnreadForChat({ chatId: chat.id });
      await markConversationReadService(chat.id);
      const messagesResponse = await getChatMessagesService(chat.id);
      const normalizedMessages = normalizeChatMessages(
        messagesResponse.data?.data,
        chat,
      );

      setMessagesByChat((prev) => ({
        ...prev,
        [chat.id]: normalizedMessages,
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  }, [clearUnreadForChat]);

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [buddyResponse, channelResponse, statusResponse] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
        getChatStatusService().catch(() => null),
      ]);

      const chatUsers = getArrayPayload(buddyResponse.data?.data);
      const chatConversations = getArrayPayload(channelResponse.data?.data);
      const otherChatUsers = chatUsers.filter((user) => !isCurrentUserRecord(user));
      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );
      const readKeys = readConversationKeysRef.current;
      const shouldKeepRead = (conversation) => {
        const conversationIds = [
          conversation?.chat_id,
          conversation?.chatId,
          conversation?.id,
          getChannelId(conversation),
        ]
          .map((value) => String(value || ""))
          .filter(Boolean);
        const participants = Array.isArray(conversation?.participants)
          ? conversation.participants
          : [];

        return (
          conversationIds.some((value) => readKeys.has(`chat:${value}`)) ||
          participants.some((participant) => {
            const participantId = String(getBuddySendId(participant) || "");
            const participantEmail = String(getBuddyEmail(participant) || "").toLowerCase();

            return (
              (participantId && readKeys.has(`user:${participantId}`)) ||
              (participantEmail && readKeys.has(`email:${participantEmail}`))
            );
          })
        );
      };
      const nextChatConversations = chatConversations.map((conversation) =>
        shouldKeepRead(conversation)
          ? {
              ...conversation,
              unreadCount: 0,
              unread_count: 0,
              unread: 0,
              unreadMessages: 0,
            }
          : conversation,
      );
      const nextChatUsers = chatUsers.map((user) => {
        const userId = String(getBuddySendId(user) || "");
        const userEmail = String(getBuddyEmail(user) || "").toLowerCase();
        const shouldKeepUserRead =
          (userId && readKeys.has(`user:${userId}`)) ||
          (userEmail && readKeys.has(`email:${userEmail}`));

        return shouldKeepUserRead
          ? { ...user, unreadCount: 0, unread_count: 0, unread: 0, unreadMessages: 0 }
          : user;
      });

      setBuddies(nextChatUsers);
      setChannels(nextChatConversations);
      setCurrentStatus(
        statusResponse?.data?.data?.user?.presence ||
          statusResponse?.data?.data?.user?.status ||
          "online",
      );

      const backendUser = statusResponse?.data?.data?.user;
      if (backendUser) {
        setProfileUser((prev) => {
          const nextUser = {
            ...(getTokenUser() || {}),
            ...(prev || {}),
            ...backendUser,
            avatarUrl: getImageUrl(backendUser) || getImageUrl(prev),
            imageUrl: getImageUrl(backendUser) || getImageUrl(prev),
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          return nextUser;
        });
      } else {
        const tokenUser = getTokenUser();

        if (tokenUser) {
          localStorage.setItem("user", JSON.stringify(tokenUser));
          setProfileUser(tokenUser);
        }
      }

      if (id && !selectedChat) {
        const decodedId = decodeURIComponent(id);
        const buddy = otherChatUsers.find((item) =>
          [getBuddySendId(item), getBuddyEmail(item)].some(
            (value) => String(value) === decodedId
          )
        );
        const channel = otherConversations.find(
          (item) => getChannelId(item) === decodedId
        );

        if (buddy) {
          setSelectedChat({
            type: "person",
            source: "local",
            id: getBuddySendId(buddy),
            title: getBuddyName(buddy),
            subtitle: getBuddyEmail(buddy),
            imageUrl: getImageUrl(buddy),
            currentUserId,
            raw: buddy,
          });
          setTab("conversations");
        } else if (channel) {
          setSelectedChat({
            type: "channel",
            source: "local",
            id: getChannelId(channel),
            title: getChannelName(channel),
            subtitle: getChannelId(channel),
            imageUrl: getImageUrl(channel),
            currentUserId,
            raw: channel,
          });
          setTab("conversations");
        }
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, id, isCurrentUserRecord, isSelfConversation, selectedChat]);

  useEffect(() => {
    if (initialFetchStartedRef.current) return;

    initialFetchStartedRef.current = true;
    fetchChatData();
  }, [fetchChatData]);

  useEffect(() => {
    if (
      selectedChat?.type === "person" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadDirectChatHistory(selectedChat);
    }
  }, [loadDirectChatHistory, selectedChat]);

  useEffect(() => {
    if (
      selectedChat?.type === "channel" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadChannelHistory(selectedChat);
    }
  }, [loadChannelHistory, selectedChat]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messagesByChat, selectedChat]);

  useEffect(() => {
    setPendingFiles([]);
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [selectedChat?.id]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return conversationItems.filter((item) => {
      const isChannel = item.__conversationType === "channel";
      const name = isChannel ? getChannelName(item) : getBuddyName(item);
      const secondary = isChannel ? getChannelId(item) : getBuddyEmail(item);
      return (
        !term ||
        name.toLowerCase().includes(term) ||
        secondary.toLowerCase().includes(term)
      );
    });
  }, [conversationItems, searchTerm]);

  const currentMessages = selectedChat
    ? messagesByChat[selectedChat.id] || []
    : [];

  const selectBuddy = (buddy) => {
    const email = getBuddyEmail(buddy);
    const sendId = getBuddySendId(buddy);
    const directConversationId = buddy?.directConversationId || buddy?.chat_id || buddy?.chatId;
    if (!sendId) return;

    const chat = {
      type: "person",
      source: "local",
      id: sendId,
      chatId: directConversationId || null,
      title: getBuddyName(buddy),
      subtitle: email,
      raw: buddy,
      imageUrl: getImageUrl(buddy),
      currentUserId,
    };

    setSelectedChat(chat);
    setSendError("");
    loadedChatHistoryRef.current.delete(sendId);
    clearUnreadForChat({ chatId: directConversationId, userId: sendId, email });
    if (directConversationId) {
      markConversationReadService(directConversationId).catch(() => {});
    }
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(sendId)}`);
  };

  const selectChannel = (channel) => {
    const channelId = getChannelId(channel);
    if (!channelId) return;

    const chat = {
      type: "channel",
      source: "local",
      id: channelId,
      title: getChannelName(channel),
      subtitle: channelId,
      raw: channel,
      imageUrl: getImageUrl(channel),
      currentUserId,
    };

    setSelectedChat(chat);
    setSendError("");
    loadedChatHistoryRef.current.delete(channelId);
    clearUnreadForChat({ chatId: channelId });
    markConversationReadService(channelId).catch(() => {});
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
  };

  const toggleGroupUser = (userId) => {
    setGroupUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const openGroupDialog = () => {
    setGroupTitle("");
    setGroupUserIds([]);
    setGroupError("");
    setGroupDialogOpen(true);
  };

  const handleCreateGroup = async () => {
    if (creatingGroup) return;
    if (groupUserIds.length === 0) {
      setGroupError("Select at least one person.");
      return;
    }

    setCreatingGroup(true);
    setGroupError("");

    try {
      const response = await createGroupChatService({
        title: groupTitle.trim() || "Group chat",
        userIds: groupUserIds,
      });
      const conversation = response.data?.data;
      const channelId = getChannelId(conversation);

      setChannels((prev) => [conversation, ...prev]);
      setSelectedChat({
        type: "channel",
        source: "local",
        id: channelId,
        title: getChannelName(conversation),
        subtitle: channelId,
        raw: conversation,
        imageUrl: getImageUrl(conversation),
        currentUserId,
      });
      setTab("conversations");
      setGroupDialogOpen(false);

      if (channelId) {
        navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
      }
    } catch (error) {
      setGroupError(normalizeChatError(error));
    } finally {
      setCreatingGroup(false);
    }
  };

  const selectedGroupParticipantIds = useMemo(() => {
    const participants = Array.isArray(selectedChat?.raw?.participants)
      ? selectedChat.raw.participants
      : [];

    return new Set(
      participants
        .map((participant) => String(getBuddySendId(participant) || ""))
        .filter(Boolean),
    );
  }, [selectedChat]);

  const addableGroupMembers = useMemo(
    () =>
      visibleBuddies.filter(
        (buddy) => !selectedGroupParticipantIds.has(String(getBuddySendId(buddy))),
      ),
    [selectedGroupParticipantIds, visibleBuddies],
  );
  const selectedMentionableUsers = useMemo(() => {
    if (!selectedChat) return [];

    if (selectedChat.type !== "channel") {
      return selectedChat.raw ? [selectedChat.raw] : [];
    }

    const participants = Array.isArray(selectedChat.raw?.participants)
      ? selectedChat.raw.participants
      : [];

    return uniqueUsersByIdentity(
      participants.filter((participant) => !isCurrentUserRecord(participant)),
    );
  }, [isCurrentUserRecord, selectedChat, uniqueUsersByIdentity]);

  const openAddMembersDialog = () => {
    setAddMemberUserIds([]);
    setAddMembersError("");
    setAddMembersDialogOpen(true);
  };

  const toggleAddMemberUser = (userId) => {
    setAddMemberUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const handleAddGroupMembers = async () => {
    if (!selectedChat || selectedChat.type !== "channel" || addingMembers) return;
    if (addMemberUserIds.length === 0) {
      setAddMembersError("Select at least one person.");
      return;
    }

    setAddingMembers(true);
    setAddMembersError("");

    try {
      const response = await addGroupMembersService(selectedChat.id, addMemberUserIds);
      const updatedConversation =
        response.data?.data?.conversation ||
        response.data?.data ||
        selectedChat.raw;

      setChannels((prev) =>
        prev.map((channel) =>
          getChannelId(channel) === selectedChat.id ? updatedConversation : channel,
        ),
      );
      setSelectedChat((prev) =>
        prev?.id === selectedChat.id
          ? {
              ...prev,
              title: getChannelName(updatedConversation),
              raw: updatedConversation,
              imageUrl: getImageUrl(updatedConversation),
            }
          : prev,
      );
      setAddMembersDialogOpen(false);
    } catch (error) {
      setAddMembersError(normalizeChatError(error));
    } finally {
      setAddingMembers(false);
    }
  };

  const handleToggleGroupMute = (chatId) => {
    if (!chatId) return;

    setMutedGroupIds((prev) => {
      const normalizedChatId = String(chatId);
      const next = prev.includes(normalizedChatId)
        ? prev.filter((id) => id !== normalizedChatId)
        : [...prev, normalizedChatId];

      localStorage.setItem("chat_muted_group_ids", JSON.stringify(next));
      return next;
    });
  };

  const handleLeaveGroup = async (chatId) => {
    if (!chatId) return;

    try {
      await leaveGroupConversationService(chatId);
      setChannels((prev) =>
        prev.filter((channel) => String(getChannelId(channel)) !== String(chatId)),
      );
      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[String(chatId)];
        return next;
      });
      setMutedGroupIds((prev) => {
        const next = prev.filter((id) => id !== String(chatId));
        localStorage.setItem("chat_muted_group_ids", JSON.stringify(next));
        return next;
      });
      setSelectedChat(null);
      navigate(CHAT_APP_BASE_PATH);
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleStatusChange = async (presence) => {
    if (statusSaving) return;

    setStatusSaving(true);
    setCurrentStatus(presence);

    try {
      await updateChatStatusService(presence);
      await fetchChatData();
      if (selectedChat?.type === "channel") {
        clearUnreadForChat({ chatId: selectedChat.id });
      } else if (selectedChat?.type === "person") {
        clearUnreadForChat({
          chatId: selectedChat.chatId,
          userId: selectedChat.id,
          email: selectedChat.subtitle || getBuddyEmail(selectedChat.raw),
        });
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    if (!file || avatarUploading) return;

    setAvatarUploading(true);
    setLoadError("");

    try {
      const response = await updateChatAvatarService(file);
      const updatedUser = response.data?.data?.user;
      const nextAvatarUrl = getImageUrl(updatedUser);

      setProfileUser((prev) => {
        const nextUser = {
          ...(prev || {}),
          ...(updatedUser || {}),
          avatarUrl: nextAvatarUrl,
          imageUrl: nextAvatarUrl,
        };
        localStorage.setItem("user", JSON.stringify(nextUser));
        return nextUser;
      });
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleStartConversationCall = async (type) => {
    if (!selectedChat || callStarting) return;

    setCallStarting(true);
    setSendError("");
    setCallError("");

    try {
      let chatId =
        selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

      if (!chatId && selectedChat.type === "person") {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId =
          openResponse.data?.data?.chat_id ||
          openResponse.data?.data?.data?.chat_id ||
          null;

        if (chatId) {
          setSelectedChat((prev) =>
            prev?.id === selectedChat.id ? { ...prev, chatId } : prev
          );
        }
      }

      if (!chatId) {
        setSendError("Open this conversation before starting a call.");
        return;
      }

      const response = await startConversationCallService(chatId, type);
      const call = response.data?.data;
      if (call?.status === "missed") {
        setActiveCall(null);
        setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
      } else {
        setActiveCall(call);
      }
    } catch (error) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      const existingCall = error?.response?.data?.details?.call;
      if (existingCall?.id) setActiveCall(existingCall);
      setCallNotice(message);
    } finally {
      setCallStarting(false);
    }
  };

  const handleRespondToCall = async (action) => {
    if (!incomingCall?.id || !incomingCall?.chatId || callResponding) return;
    setCallResponding(true);
    setSendError("");
    setCallError("");
    try {
      const response = await respondConversationCallService(
        incomingCall.chatId,
        incomingCall.id,
        action,
      );
      const call = response.data?.data;
      setIncomingCall(null);
      if (action === "accept") {
        setActiveCall(call);
        openGoogleMeet(call);
      }
    } catch (error) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      setCallError(message);
      setCallNotice(message);
      const code = error?.response?.data?.code;
      if (code === "CHAT_CALL_ALREADY_ANSWERED" || code === "CHAT_CALL_NOT_FOUND") {
        setIncomingCall(null);
      }
    } finally {
      setCallResponding(false);
    }
  };

  const handleEndActiveCall = async () => {
    if (!activeCall?.id || !activeCall?.chatId) {
      setActiveCall(null);
      return;
    }

    try {
      await endConversationCallService(activeCall.chatId, activeCall.id);
    } catch (error) {
      setCallNotice(normalizeChatError(error));
    } finally {
      setActiveCall(null);
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || !selectedChat || uploading || sending) return;

    setPendingFiles((prev) => [...prev, ...files]);
    setSendError("");
  };

  const removePendingFile = (fileIndex) => {
    setPendingFiles((prev) => prev.filter((_, index) => index !== fileIndex));
  };

  const refreshSelectedChatMessages = async (chatId) => {
    if (!chatId || !selectedChat) return;

    const messagesResponse = await getChatMessagesService(chatId);
    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChat.id]: normalizeChatMessages(
        messagesResponse.data?.data,
        selectedChat
      ),
    }));
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    const filesToSend = pendingFiles;
    if ((!text && filesToSend.length === 0) || !selectedChat || sending) return;
    const mentionedUsers = uniqueUsersByIdentity(selectedMentionableUsers)
      .filter((buddy) => {
        const name = getBuddyName(buddy);
        const email = getBuddyEmail(buddy);
        return (
          text.includes(`@${name}`) ||
          (email && text.includes(`@${email}`))
        );
      })
      .map((buddy) => ({
        userId: String(getBuddySendId(buddy)),
        displayName: getBuddyName(buddy),
        email: getBuddyEmail(buddy),
      }));
    const messageOptions = {
      ...(mentionedUsers.length ? { metadata: { mentions: mentionedUsers } } : {}),
      ...(replyToMessage?.id ? { replyTo: replyToMessage.id } : {}),
    };

    setSending(true);
    setUploading(filesToSend.length > 0);
    setSendError("");

    try {
      let chatId =
        selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

      if (editingMessage) {
        if (!chatId || !text || filesToSend.length > 0) return;
        await editConversationMessageService(chatId, editingMessage.id, text);
        await refreshSelectedChatMessages(chatId);
        setInputValue("");
        setEditingMessage(null);
        setReplyToMessage(null);
        return;
      }

      if (selectedChat.type === "channel") {
        if (text) {
          await sendConversationMessageService(selectedChat.id, text, messageOptions);
        }
      } else if (text) {
        const response = chatId
          ? await sendConversationMessageService(chatId, text, messageOptions)
          : await sendDirectMessageService(selectedChat.id, text, messageOptions);
        const data = response.data?.data || {};
        chatId =
          data?.chatId ||
          data?.chat?.chat_id ||
          data?.chat?.data?.chat_id ||
          chatId ||
          null;

        if (chatId) {
          setSelectedChat((prev) =>
            prev?.id === selectedChat.id ? { ...prev, chatId } : prev
          );
        }
      } else if (!chatId) {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId =
          openResponse.data?.data?.chat_id ||
          openResponse.data?.data?.data?.chat_id ||
          null;

        if (chatId) {
          setSelectedChat((prev) =>
            prev?.id === selectedChat.id ? { ...prev, chatId } : prev
          );
        }
      }

      if (filesToSend.length > 0 && chatId) {
        await Promise.all(
          filesToSend.map((file) => shareConversationFileService(chatId, file)),
        );
      }

      if (chatId) {
        await refreshSelectedChatMessages(chatId);
      }

      setInputValue("");
      setPendingFiles([]);
      setReplyToMessage(null);
      setEditingMessage(null);
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    if (!selectedChat || !messageId || !emoji) return;
    const targetMessage = (messagesByChat[selectedChat.id] || []).find(
      (message) => String(message.id) === String(messageId),
    );
    if (targetMessage?.direction === "outbound") return;

    const chatId =
      selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

    if (!chatId) return;

    const existingReaction = (messagesByChat[selectedChat.id] || [])
      .find((message) => String(message.id) === String(messageId))
      ?.reactions?.find((reaction) => reaction.emoji === emoji && reaction.reacted);

    try {
      if (existingReaction) {
        await removeMessageReactionService(chatId, messageId, emoji);
      } else {
        await addMessageReactionService(chatId, messageId, emoji);
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
      return;
    }

    await refreshSelectedChatMessages(chatId);
  };

  const handleReplyToMessage = (message) => {
    setEditingMessage(null);
    setReplyToMessage(message);
  };

  const handleEditMessage = (message) => {
    if (message?.direction !== "outbound") return;
    setReplyToMessage(null);
    setEditingMessage(message);
    setInputValue(message.text || "");
  };

  const handlePinMessage = async (message) => {
    if (!selectedChat || !message?.id) return;

    const chatId =
      selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

    if (!chatId) {
      setSendError("Open this conversation before pinning a message.");
      return;
    }

    const pinned = !message.metadata?.pinned;

    try {
      const response = await pinConversationMessageService(chatId, message.id, pinned);
      const updatedMessage = normalizeRealtimeMessage(response.data?.data, {
        ...selectedChat,
        currentUserId,
      });

      if (!updatedMessage) return;

      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map((item) =>
          String(item.id) === String(updatedMessage.id)
            ? { ...item, ...updatedMessage }
            : item,
        ),
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleCancelComposerMode = () => {
    setReplyToMessage(null);
    setEditingMessage(null);
    setInputValue("");
  };

  const handleForwardMessage = async (message, target) => {
    const text = String(message?.text || "").trim();
    if (!text || !target) return;

    const isChannelTarget = target.__conversationType === "channel";
    const targetChatId = isChannelTarget
      ? getChannelId(target)
      : target.directConversationId || target.chat_id || target.chatId;

    try {
      if (isChannelTarget || targetChatId) {
        await sendConversationMessageService(targetChatId, text, {
          metadata: { forwardedFrom: message.id },
        });
      } else {
        await sendDirectMessageService(getBuddySendId(target), text, {
          metadata: { forwardedFrom: message.id },
        });
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  return (
    <>
      <Box
        sx={{
          height: standalone ? "100vh" : "calc(100vh - 48px)",
          minHeight: standalone ? "100vh" : 620,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "380px minmax(0, 1fr)" },
          bgcolor: "#f3f5f8",
          border: standalone ? "none" : "1px solid #dfe3ea",
          borderRadius: standalone ? 0 : 2,
          overflow: "hidden",
        }}
      >
      <ChatSidebar
        avatarUploading={avatarUploading}
        currentStatus={currentStatus}
        filteredItems={filteredItems}
        loadError={loadError}
        loading={loading}
        onAvatarUpload={handleAvatarUpload}
        onCreateGroup={openGroupDialog}
        onRefresh={fetchChatData}
        onSelectBuddy={selectBuddy}
        onSelectChannel={selectChannel}
        onStatusChange={handleStatusChange}
        searchTerm={searchTerm}
        selectedChat={selectedChat}
        statusSaving={statusSaving}
        currentUser={currentUser}
        totalUnreadCount={totalUnreadCount}
        setSearchTerm={setSearchTerm}
        setTab={setTab}
      />
      <ChatWindow
        activeCall={activeCall}
        chatBoxRef={chatBoxRef}
        callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
        availableChats={conversationItems}
        currentUser={currentUser}
        editingMessage={editingMessage}
        currentMessages={currentMessages}
        handleFileUpload={handleFileUpload}
        handleCancelComposerMode={handleCancelComposerMode}
        handleEditMessage={handleEditMessage}
        handleForwardMessage={handleForwardMessage}
        handlePinMessage={handlePinMessage}
        handleReaction={handleReaction}
        handleReplyToMessage={handleReplyToMessage}
        handleSend={handleSend}
        onEndActiveCall={handleEndActiveCall}
        onLeaveGroup={handleLeaveGroup}
        inputValue={inputValue}
        mutedGroupIds={mutedGroupIds}
        mentionableUsers={selectedMentionableUsers}
        pendingFiles={pendingFiles}
        removePendingFile={removePendingFile}
        selectedChat={selectedChat}
        sendError={sendError}
        sending={sending}
        replyToMessage={replyToMessage}
        onStartConversationCall={handleStartConversationCall}
        onOpenAddMembers={openAddMembersDialog}
        onToggleGroupMute={handleToggleGroupMute}
        setInputValue={setInputValue}
        setSelectedChat={setSelectedChat}
        uploading={uploading}
      />
      </Box>
      <IncomingCallDialog
        call={incomingCall}
        error={callError}
        responding={callResponding}
        onAccept={() => handleRespondToCall("accept")}
        onDecline={() => handleRespondToCall("decline")}
      />
      <Snackbar
        open={Boolean(callNotice)}
        autoHideDuration={6000}
        onClose={() => setCallNotice("")}
        message={callNotice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Create group</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            autoFocus
            label="Group name"
            margin="dense"
            size="small"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
          />
          {groupError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {groupError}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Members
          </Typography>
          <List dense sx={{ maxHeight: 300, overflow: "auto", mt: 0.5 }}>
            {visibleBuddies.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              const checked = groupUserIds.includes(userId);

              return (
                <ListItemButton key={userId} onClick={() => toggleGroupUser(userId)}>
                  <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                  <ListItemText
                    primary={getBuddyName(buddy)}
                    secondary={getBuddyEmail(buddy)}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={creatingGroup}
          >
            {creatingGroup ? "Creating" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={addMembersDialogOpen}
        onClose={() => setAddMembersDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add people to group</DialogTitle>
        <DialogContent dividers>
          {addMembersError && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {addMembersError}
            </Alert>
          )}
          <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
            {addableGroupMembers.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              const checked = addMemberUserIds.includes(userId);

              return (
                <ListItemButton key={userId} onClick={() => toggleAddMemberUser(userId)}>
                  <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                  <ListItemText
                    primary={getBuddyName(buddy)}
                    secondary={getBuddyEmail(buddy)}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
          </List>
          {addableGroupMembers.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              Everyone available is already in this group.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMembersDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddGroupMembers}
            disabled={addingMembers || addableGroupMembers.length === 0}
          >
            {addingMembers ? "Adding" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
