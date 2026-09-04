import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  showChatNotification,
  playCallNotificationSound,
  playMessageNotificationSound,
} from "./chatNotifications";
import { useChatRealtime } from "./useChatRealtime";
import IncomingCallDialog from "./calls/IncomingCallDialog";
import InternalCallPanel from "./calls/InternalCallPanel";
import { useCallTone } from "./calls/useCallTone";
import {
  getChatMessagesService,
  getChatSettingsService,
  clearChatHistoryService,
  getChatStatusService,
  getChatUsersService,
  getChatConversationsService,
  addGroupMembersService,
  addMessageReactionService,
  createGroupChatService,
  deleteConversationMessageService,
  editConversationMessageService,
  leaveGroupConversationService,
  removeGroupMemberService,
  transferGroupOwnershipService,
  markConversationReadService,
  openDirectChatService,
  pinConversationMessageService,
  removeMessageReactionService,
  sendConversationMessageService,
  sendDirectMessageService,
  shareConversationFileService,
  startConversationCallService,
  endConversationCallService,
  getActiveConversationCallsService,
  respondConversationCallService,
  updateChatAvatarService,
  updateChatAvatarUrlService,
  updateChatStatusService,
  updateChatSettingsService,
} from "../Services/chat.services";
import { clearAuthToken, getTokenUser } from "../utils/authToken";
import { useThemeMode } from "../themeMode";
import { getInitial } from "./sidebar/sidebarUtils";
import { AddMembersDialog, GroupCreationDialog } from "./chatWindow/GroupDialogs";
import AdminPage from "../AdminPage";

const getMessageTimestamp = (message) => {
  const value =
    message?.createdAt ||
    message?.created_at ||
    message?.sentAt ||
    message?.sent_at ||
    message?.timestamp ||
    message?.time;
  const numericValue = Number(value);
  const timestamp = Number.isFinite(numericValue) && numericValue > 0
    ? numericValue < 1e12
      ? numericValue * 1000
      : numericValue
    : value
      ? new Date(value).getTime()
      : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getConversationActivityTime = (conversation) => {
  const value =
    conversation?.lastMessage?.createdAt ||
    conversation?.lastMessage?.created_at ||
    conversation?.last_message?.createdAt ||
    conversation?.last_message?.created_at ||
    conversation?.lastMessageAt ||
    conversation?.last_message_at ||
    conversation?.lastMessageTime ||
    conversation?.last_message_time ||
    conversation?.updatedAt ||
    conversation?.updated_at;

  if (value == null || value === "") return 0;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue < 1e12 ? numericValue * 1000 : numericValue;
  }
  const parsedValue = new Date(value).getTime();
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const hasConversationHistory = (conversation) => Boolean(
  conversation?.lastMessage ||
  conversation?.last_message ||
  conversation?.lastMessageAt ||
  conversation?.last_message_at
);

const escapeMentionRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const messageMentionsUser = (message, userId, userEmail) => {
  const mentions = message?.metadata?.mentions || message?.mentions || [];
  if (!Array.isArray(mentions)) return false;

  return mentions.some((mention) => {
    const mentionId = String(
      mention?.userId || mention?.user_id || mention?.id || "",
    );
    const mentionEmail = String(mention?.email || "").trim().toLowerCase();
    return (
      (userId && mentionId === userId) ||
      (userEmail && mentionEmail === userEmail)
    );
  });
};

const textContainsMention = (text, label) => {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) return false;

  return new RegExp(
    `(?:^|\\s)@${escapeMentionRegExp(normalizedLabel)}(?=\\s|$|[.,!?;:])`,
    "i",
  ).test(String(text || ""));
};

const isMessageReadByUser = (message, currentUserId, currentUserEmail) => {
  if (message?.isRead === true || message?.is_read === true || message?.read === true) {
    return true;
  }

  const readers = [
    message?.readBy,
    message?.read_by,
    message?.readStates,
    message?.read_states,
    message?.readReceipts,
    message?.read_receipts,
  ].find(Array.isArray);

  if (!readers) return false;

  return readers.some((reader) => {
    const readerId = String(
      typeof reader === "object"
        ? reader?.userId || reader?.user_id || reader?.id || reader?.appUserId
        : reader,
    );
    const readerEmail = String(
      typeof reader === "object"
        ? reader?.email || reader?.email_id || reader?.mailid
        : "",
    ).toLowerCase();

    return (
      (currentUserId && readerId === currentUserId) ||
      (currentUserEmail && readerEmail === currentUserEmail)
    );
  });
};

const getConversationIdFromResponse = (response) => {
  const root = response?.data;
  const payload = root?.data;
  const candidates = [
    payload?.chat_id,
    payload?.chatId,
    payload?.conversation_id,
    payload?.conversationId,
    payload?.id,
    payload?.conversation?.chat_id,
    payload?.conversation?.chatId,
    payload?.conversation?.conversation_id,
    payload?.conversation?.conversationId,
    payload?.conversation?.id,
    payload?.data?.chat_id,
    payload?.data?.chatId,
    payload?.data?.conversation_id,
    payload?.data?.conversationId,
    payload?.data?.id,
  ];

  return candidates.find((value) => value !== undefined && value !== null && value !== "") || null;
};

export default function ChatSystem({ standalone = false, adminPage = false }) {
  const { setMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const settingsPage = location.pathname.endsWith("/settings");
  const groupPage = location.pathname.endsWith("/groups/new");
  const { id } = useParams();
  const chatBoxRef = useRef(null);
  const initialFetchStartedRef = useRef(false);
  const loadedChatHistoryRef = useRef(new Set());
  const handledRealtimeMessageKeysRef = useRef(new Set());
  const chatClearVersionsRef = useRef(new Map());
  const realtimeStartedAtRef = useRef(Date.now());

  const [, setTab] = useState("conversations");
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [messageInfoVersions, setMessageInfoVersions] = useState({});
  const [typingUsersByChat, setTypingUsersByChat] = useState({});
  const [messagePaginationByChat, setMessagePaginationByChat] = useState({});
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [enterToSend, setEnterToSend] = useState(false);
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
  const [groupSearch, setGroupSearch] = useState("");
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
  const [callMinimized, setCallMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStarting, setCallStarting] = useState(false);
  const [callResponding, setCallResponding] = useState(false);
  const [callError, setCallError] = useState("");
  const [callNotice, setCallNotice] = useState("");
  const [confirmationDialog, setConfirmationDialog] = useState(null);
  const confirmationResolverRef = useRef(null);
  useCallTone(incomingCall ? "incoming" : activeCall?.status === "ringing" ? "outgoing" : null);

  const requestConfirmation = useCallback((options) => new Promise((resolve) => {
    confirmationResolverRef.current = resolve;
    setConfirmationDialog({
      title: options?.title || "Please confirm",
      message: options?.message || "Are you sure you want to continue?",
      confirmLabel: options?.confirmLabel || "Confirm",
      confirmColor: options?.confirmColor || "error",
    });
  }), []);

  const closeConfirmation = (confirmed) => {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmationDialog(null);
  };

  const [mutedChatIds, setMutedChatIds] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const filterBlockedMessages = useCallback(
    (messages = []) => messages.filter((message) => !blockedUserIds.includes(String(message.authorId))),
    [blockedUserIds],
  );
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
    currentUser?.appUserId ||
      currentUser?.app_user_id ||
      currentUser?.userId ||
      currentUser?.user_id ||
      currentUser?.id ||
      ""
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();

  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;

    getActiveConversationCallsService()
      .then((response) => {
        if (cancelled) return;
        const calls = response.data?.data?.calls || response.data?.data || [];
        const call = Array.isArray(calls) ? calls[0] : null;
        if (!call?.id) return;
        if (String(call.startedBy?.id) === currentUserId || call.status !== "ringing") {
          setActiveCall(call);
        } else {
          setIncomingCall(call);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

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
    () => {
      const getUserIds = (user) => [
        user?.id,
        user?.userId,
        user?.user_id,
        user?.appUserId,
        user?.app_user_id,
      ].filter(Boolean).map(String);
      const directParticipants = channels
        .filter((conversation) =>
          !isSelfConversation(conversation) &&
          hasConversationHistory(conversation) &&
          (conversation?.isDirect ||
            conversation?.type === "direct" ||
            conversation?.conversationType === "direct"),
        )
        .flatMap((conversation) =>
        Array.isArray(conversation?.participants) ? conversation.participants : [],
      );
      const hasPreviousDirectConversation = (buddy) => {
        const buddyIds = getUserIds(buddy);
        const buddyEmail = String(getBuddyEmail(buddy) || "").toLowerCase();
        return directParticipants.some((participant) =>
          getUserIds(participant).some((participantId) => buddyIds.includes(participantId)) ||
          (buddyEmail && String(getBuddyEmail(participant)).toLowerCase() === buddyEmail),
        );
      };

      return uniqueUsersByIdentity(
        buddies.filter((buddy) => !isCurrentUserRecord(buddy) && hasPreviousDirectConversation(buddy)),
      );
    },
    [buddies, channels, isCurrentUserRecord, isSelfConversation, uniqueUsersByIdentity],
  );
  const allVisibleBuddies = useMemo(
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
      const buddiesForList = searchTerm.trim() ? allVisibleBuddies : visibleBuddies;
      const directRows = buddiesForList.map((buddy) => {
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
        const directConversationId =
          matchingDirectConversation?.chat_id ||
          matchingDirectConversation?.chatId ||
          matchingDirectConversation?.id ||
          buddy?.directConversationId ||
          buddy?.chat_id ||
          buddy?.chatId ||
          "";
        return {
          ...(matchingDirectConversation || {}),
          ...buddy,
          directConversationId,
          unreadCount: matchingDirectConversation
            ? getUnreadCount(matchingDirectConversation)
            : getUnreadCount(buddy),
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

      const items = [
        ...directRows,
        ...visibleGroupChannels.map((channel) => ({
          ...channel,
          __conversationType: "channel",
        })),
      ];

      return items.sort(
        (first, second) =>
          getConversationActivityTime(second) - getConversationActivityTime(first),
      );
    },
    [allVisibleBuddies, searchTerm, visibleBuddies, visibleDirectChannels, visibleGroupChannels],
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
      if (!isOwnMessage && blockedUserIds.includes(String(senderId))) return;
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
      if (blockedUserIds.includes(String(normalizedMessage.authorId))) return;

      const selectedChatIds = [
        selectedChat?.id,
        selectedChat?.chatId,
        selectedChat?.raw?.id,
        selectedChat?.raw?.chat_id,
        selectedChat?.raw?.chatId,
        selectedChat?.raw?.conversationId,
        selectedChat?.raw?.conversation_id,
      ]
        .filter(Boolean)
        .map(String);
      const isActiveChat = selectedChatIds.includes(String(chatId));
      const messageKeys = Array.from(new Set([
        localKey,
        ...(isActiveChat ? [selectedChat?.id] : []),
      ].filter(Boolean).map(String)));
      const existingMessages = messageKeys.reduce(
        (allMessages, key) => [...allMessages, ...(messagesByChat[key] || [])],
        [],
      );
      const isAlreadyLoaded = existingMessages.some(
        (item) => String(item.id) === String(normalizedMessage.id),
      );
      const messageTimestamp = getMessageTimestamp(message);
      const isNewSinceRealtimeStarted =
        !messageTimestamp || messageTimestamp >= realtimeStartedAtRef.current;
      const isReadByCurrentUser = isMessageReadByUser(
        message,
        currentUserId,
        currentUserEmail,
      );
      const isMentioned = messageMentionsUser(
        message,
        currentUserId,
        currentUserEmail,
      );

      const shouldTreatAsRead = isActiveChat && !document.hidden;

      if (messageKeys.length > 0) {
        setMessagesByChat((prev) => {
          const next = { ...prev };
          messageKeys.forEach((key) => {
            const existing = next[key] || [];
            if (!existing.some((item) => String(item.id) === String(normalizedMessage.id))) {
              next[key] = [...existing, normalizedMessage];
            }
          });
          return next;
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
          const currentUnreadCount = getUnreadCount(channel);
          const nextUnreadCount =
            !isOwnMessage && !shouldTreatAsRead
              ? currentUnreadCount + 1
              : currentUnreadCount;
          return {
            ...channel,
            lastMessage: message,
            unreadCount: nextUnreadCount,
            unread_count: nextUnreadCount,
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
            unreadCount: !isOwnMessage && !shouldTreatAsRead ? 1 : 0,
            unread_count: !isOwnMessage && !shouldTreatAsRead ? 1 : 0,
            lastMessage: message,
          },
          ...nextChannels,
        ];
      });

      // Realtime updates the badge immediately. Refresh the conversation rows
      // as a reconciliation step so counts remain correct across tabs/devices.
      getChatConversationsService()
        .then((response) => {
          setChannels(getArrayPayload(response.data?.data));
        })
        .catch(() => {});

      const shouldNotify =
        !isOwnMessage &&
        (!isActiveChat || document.hidden) &&
        !isAlreadyLoaded &&
        isNewSinceRealtimeStarted &&
        !isReadByCurrentUser;
      const shouldNotifyMention = shouldNotify && isMentioned;

      if (shouldNotify) {
        if (mutedChatIds.includes(String(chatId)) && !shouldNotifyMention) return;

        const senderName =
          message?.sender?.name ||
          message?.sender?.display_name ||
          buddies.find((buddy) => getBuddySendId(buddy) === senderId)?.name ||
          "Someone";

        showChatNotification({
          title: shouldNotifyMention ? `${senderName} mentioned you` : senderName,
          body: shouldNotifyMention
            ? `${senderName}: ${getMessageText(message)}`
            : getMessageText(message),
          icon: getImageUrl(message?.sender),
           tag: `chat-${chatId}`,
           url: localKey
             ? `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`
             : CHAT_APP_BASE_PATH,
          onClick: () => {
            if (localKey) {
              navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
            }
          },
        });
        playMessageNotificationSound();
      }

      if (shouldTreatAsRead && !isOwnMessage) {
        markConversationReadService(chatId).catch(() => {});
      }
    },
    [
      blockedUserIds,
      buddies,
      channels,
      currentUser,
      currentUserEmail,
      currentUserId,
      messagesByChat,
      mutedChatIds,
      navigate,
      selectedChat,
    ],
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
      // Message info dialogs use this version to refresh their delivery/read
      // recipients as soon as a participant's read receipt arrives.
      setMessageInfoVersions((prev) => ({
        ...prev,
        [localKey]: (prev[localKey] || 0) + 1,
      }));
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
        mutedChatIds.includes(String(chatId)) ||
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
         url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey || chatId)}`,
        onClick: () => {
          if (localKey) {
            navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(localKey)}`);
          }
        },
      });
    },
    [buddies, channels, currentUserEmail, currentUserId, mutedChatIds, navigate],
  );

  const handleRealtimePresence = useCallback(({ userId, presence, user }) => {
    if (!userId) return;

    const nextPresence = presence || user?.presence || user?.status;

    setBuddies((prev) =>
      prev.map((buddy) =>
        String(getBuddySendId(buddy)) === String(userId)
          ? {
              ...buddy,
              ...user,
              presence: nextPresence,
              status: nextPresence,
            }
          : buddy,
      ),
    );

    setSelectedChat((prev) => {
      if (!prev || prev.type === "channel") return prev;

      const selectedUserId = String(
        getBuddySendId(prev.raw) || prev.id || "",
      );
      const selectedEmail = String(
        getBuddyEmail(prev.raw) || prev.subtitle || "",
      ).toLowerCase();
      const eventEmail = String(
        user?.email || user?.email_id || user?.mailid || "",
      ).toLowerCase();

      if (
        selectedUserId !== String(userId) &&
        (!eventEmail || selectedEmail !== eventEmail)
      ) {
        return prev;
      }

      return {
        ...prev,
        raw: {
          ...(prev.raw || {}),
          ...(user || {}),
          presence: nextPresence,
          status: nextPresence,
        },
      };
    });
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
    if (activeCall?.id || incomingCall?.id) return;
    const callerId = call.startedBy?.id || call.startedBy?.userId || call.startedBy?.user_id;
    if (blockedUserIds.includes(String(callerId))) return;
    if (String(callerId) === currentUserId) {
      setActiveCall(call);
      return;
    }
    setCallError("");
    setIncomingCall(call);
    showChatNotification({
      title: `Incoming ${call.type === "video" ? "video" : "audio"} call`,
      body: `${call.startedBy?.name || "A chat user"} is calling you`,
      tag: `chat-call-${call.id}`,
      url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(call.chatId || call.chat_id || "")}`,
      preserveCall: true,
      requireInteraction: true,
    });
    playCallNotificationSound();
  }, [activeCall?.id, blockedUserIds, currentUserId, incomingCall?.id]);

  const handleRealtimeCallAccepted = useCallback(({ call }) => {
    if (!call?.id) return;
    const peerId = call.startedBy?.id || call.startedBy?.userId || call.startedBy?.user_id;
    if (blockedUserIds.includes(String(peerId)) && String(peerId) !== currentUserId) return;
    setIncomingCall((prev) => (prev?.id === call.id ? null : prev));
    setActiveCall(call);
    showChatNotification({ title: "Call accepted", body: "Your chat call is ready.", tag: `chat-call-${call.id}` });
  }, [blockedUserIds, currentUserId]);

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

  const handleRealtimeMemberRemoved = useCallback(({ chatId, removedUser, systemMessage }) => {
    if (!chatId || !removedUser) return;
    const removedUserId = String(getBuddySendId(removedUser) || removedUser.userId || "");
    const isCurrentUserRemoved = removedUserId === currentUserId;

    if (systemMessage && !isCurrentUserRemoved) {
      const normalizedMessage = normalizeRealtimeMessage(systemMessage, {
        id: selectedChat?.id || chatId,
        currentUserId,
      });
      if (normalizedMessage) {
        setMessagesByChat((prev) => ({
          ...prev,
          [String(chatId)]: [...(prev[String(chatId)] || []), normalizedMessage],
        }));
      }
    }

    setChannels((prev) => prev
      .map((channel) => String(getChannelId(channel)) === String(chatId)
        ? {
            ...channel,
            participants: (channel.participants || []).filter(
              (participant) => String(getBuddySendId(participant)) !== removedUserId,
            ),
          }
        : channel)
      .filter((channel) => !isCurrentUserRemoved || String(getChannelId(channel)) !== String(chatId)));

    if (isCurrentUserRemoved && String(selectedChat?.chatId || selectedChat?.id) === String(chatId)) {
      setSelectedChat(null);
      navigate(CHAT_APP_BASE_PATH);
    } else if (!isCurrentUserRemoved && String(selectedChat?.id) === String(chatId)) {
      setSelectedChat((prev) => prev ? {
        ...prev,
        raw: {
          ...(prev.raw || {}),
          participants: (prev.raw?.participants || []).filter(
            (participant) => String(getBuddySendId(participant)) !== removedUserId,
          ),
        },
      } : prev);
    }

    setSendError(`${getBuddyName(removedUser)} was removed from the group.`);
  }, [currentUserId, navigate, selectedChat?.chatId, selectedChat?.id]);

  const callSocketRef = useChatRealtime({
    enabled: Boolean(currentUserId),
    activeConversationId,
    onMessage: handleRealtimeMessage,
    onMessageUpdated: handleRealtimeMessageUpdated,
    onTyping: useCallback(({ chatId, userId, name, typing }) => {
      setTypingUsersByChat((prev) => ({
        ...prev,
        [String(chatId)]: typing ? { userId: String(userId), name } : null,
      }));
    }, []),
    onMessageRead: handleRealtimeMessageRead,
    onMemberRemoved: handleRealtimeMemberRemoved,
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

  const clearUnreadForChat = useCallback(() => {}, []);

  const markChatAsRead = useCallback(
    async ({ chatId } = {}) => {
      if (!chatId) return;

      const response = await markConversationReadService(chatId);
      const markedChatId = String(
        response.data?.data?.chatId ||
          response.data?.data?.chat_id ||
          chatId,
      );

      // The successful read response is already database-backed. Apply its
      // zero unread count immediately so the badge changes in realtime.
      setChannels((previousChannels) =>
        previousChannels.map((channel) => {
          const channelIds = [
            channel?.id,
            channel?.chatId,
            channel?.chat_id,
            getChannelId(channel),
          ]
            .filter(Boolean)
            .map(String);

          return channelIds.includes(markedChatId)
            ? {
                ...channel,
                unreadCount: 0,
                unread_count: 0,
              }
            : channel;
        }),
      );
    },
    [],
  );

  useEffect(() => {
    if (!activeConversationId) return undefined;

    const markActiveChatRead = () => {
      if (document.hidden) return;
      markChatAsRead({
        chatId: activeConversationId,
        userId: selectedChat?.type === "person" ? selectedChat.id : "",
        email: selectedChat?.type === "person" ? selectedChat.subtitle : "",
      }).catch(() => {});
    };

    window.addEventListener("focus", markActiveChatRead);
    document.addEventListener("visibilitychange", markActiveChatRead);
    markActiveChatRead();

    return () => {
      window.removeEventListener("focus", markActiveChatRead);
      document.removeEventListener("visibilitychange", markActiveChatRead);
    };
  }, [
    activeConversationId,
    markChatAsRead,
    selectedChat?.id,
    selectedChat?.subtitle,
    selectedChat?.type,
  ]);

  const loadDirectChatHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "person" || !chat.id) return;

    const chatKey = String(chat.id);
    const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

    loadedChatHistoryRef.current.add(chatKey);
    clearUnreadForChat({
      chatId: chat.chatId,
      userId: chat.id,
      email: chat.subtitle || getBuddyEmail(chat.raw),
    });

    try {
      const openResponse = await openDirectChatService(chat.id);
      const chatId = getConversationIdFromResponse(openResponse);

      if (!chatId) return;

      setSelectedChat((prev) =>
        prev?.id === chat.id ? { ...prev, chatId } : prev
      );
      await markChatAsRead({
        chatId,
        userId: chat.id,
        email: chat.subtitle || getBuddyEmail(chat.raw),
      });
      const messagesResponse = await getChatMessagesService(chatId);
      // Loading history also updates the participant's lastReadAt in the
      // database. Fetch the conversation list once more so the badge reflects
      // that persisted state, even if an earlier refresh was still in flight.
      await markChatAsRead({ chatId });
      if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
      const normalizedMessages = filterBlockedMessages(normalizeChatMessages(
        messagesResponse.data?.data,
        chat
      ));

      setMessagesByChat((prev) => ({
        ...prev,
        [chat.id]: normalizedMessages,
      }));
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [chat.id]: messagesResponse.data?.data?.pagination || { hasMore: false },
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  }, [clearUnreadForChat, filterBlockedMessages, markChatAsRead]);

  const loadChannelHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "channel" || !chat.id) return;

    const chatKey = String(chat.id);
    const requestClearVersion = chatClearVersionsRef.current.get(chatKey) || 0;

    loadedChatHistoryRef.current.add(chatKey);

    try {
      await markChatAsRead({ chatId: chat.id });
      const messagesResponse = await getChatMessagesService(chat.id);
      await markChatAsRead({ chatId: chat.id });
      if ((chatClearVersionsRef.current.get(chatKey) || 0) !== requestClearVersion) return;
      const normalizedMessages = filterBlockedMessages(normalizeChatMessages(
        messagesResponse.data?.data,
        chat,
      ));

      setMessagesByChat((prev) => ({
        ...prev,
        [chat.id]: normalizedMessages,
      }));
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [chat.id]: messagesResponse.data?.data?.pagination || { hasMore: false },
      }));
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  }, [filterBlockedMessages, markChatAsRead]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedChat || loadingOlderMessages) return;

    const chatKey = selectedChat.id;
    const pagination = messagePaginationByChat[chatKey];
    if (!pagination?.hasMore || !pagination.nextCursor) return;

    const chatId = selectedChat.chatId || selectedChat.id;
    const previousHeight = chatBoxRef.current?.scrollHeight || 0;
    setLoadingOlderMessages(true);

    try {
      const response = await getChatMessagesService(chatId, {
        limit: 50,
        before: pagination.nextCursor,
      });
      const payload = response.data?.data;
      const olderMessages = filterBlockedMessages(normalizeChatMessages(payload, selectedChat));

      setMessagesByChat((prev) => {
        const existing = prev[chatKey] || [];
        const existingIds = new Set(existing.map((message) => String(message.id)));
        const uniqueOlder = olderMessages.filter(
          (message) => !existingIds.has(String(message.id)),
        );
        return { ...prev, [chatKey]: [...uniqueOlder, ...existing] };
      });
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [chatKey]: payload?.pagination || { hasMore: false },
      }));

      requestAnimationFrame(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop += chatBoxRef.current.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [chatBoxRef, filterBlockedMessages, loadingOlderMessages, messagePaginationByChat, selectedChat]);

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [buddyResponse, channelResponse, statusResponse, settingsResponse] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
        getChatStatusService().catch(() => null),
        getChatSettingsService().catch(() => null),
      ]);

      const persistedSettings = settingsResponse?.data?.data || settingsResponse?.data || {};
      if (typeof persistedSettings.enterToSend === "boolean") {
        setEnterToSend(persistedSettings.enterToSend);
      }
      if (persistedSettings.themeMode === "dark" || persistedSettings.themeMode === "light") {
        setMode(persistedSettings.themeMode);
      }
      if (Array.isArray(persistedSettings.mutedChatIds)) {
        setMutedChatIds(persistedSettings.mutedChatIds.map(String));
      }
      if (Array.isArray(persistedSettings.blockedUserIds)) {
        setBlockedUserIds(persistedSettings.blockedUserIds.map(String));
      }

      const chatUsers = getArrayPayload(buddyResponse.data?.data);
      const chatConversations = getArrayPayload(channelResponse.data?.data);
      const otherChatUsers = chatUsers.filter((user) => !isCurrentUserRecord(user));
      const otherConversations = chatConversations.filter(
        (conversation) => !isSelfConversation(conversation),
      );
      setBuddies(chatUsers);
      setChannels(chatConversations);
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
          const directConversation = otherConversations.find((conversation) =>
            Array.isArray(conversation?.participants) &&
            conversation.participants.some((participant) =>
              String(getBuddySendId(participant)) === String(getBuddySendId(buddy)) ||
              String(getBuddyEmail(participant)).toLowerCase() === String(getBuddyEmail(buddy)).toLowerCase(),
            ),
          );
          setSelectedChat({
            type: "person",
            source: "local",
            id: getBuddySendId(buddy),
            chatId:
              buddy?.directConversationId ||
              buddy?.chat_id ||
              buddy?.chatId ||
              directConversation?.chat_id ||
              directConversation?.chatId ||
              directConversation?.id ||
              null,
            title: getBuddyName(buddy),
            subtitle: getBuddyEmail(buddy),
            imageUrl: getImageUrl(buddy),
            currentUserId,
            raw: buddy,
          });
          setTab("conversations");
        } else if (channel) {
          const restoredChannelId = getChannelId(channel);
          setSelectedChat({
            type: "channel",
            source: "local",
            id: restoredChannelId,
            title: getChannelName(channel),
            subtitle: restoredChannelId,
            imageUrl: getImageUrl(channel),
            currentUserId,
            raw: channel,
          });
          // A refresh restores the group from the URL before the history
          // effect runs. Persist the read state here as well so the initial
          // unread count cannot remain visible for the restored group.
          setChannels((previousChannels) =>
            previousChannels.map((conversation) =>
              String(getChannelId(conversation)) === String(restoredChannelId)
                ? { ...conversation, unreadCount: 0, unread_count: 0 }
                : conversation,
            ),
          );
          markConversationReadService(restoredChannelId).catch(() => {});
          setTab("conversations");
        }
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, id, isCurrentUserRecord, isSelfConversation, selectedChat, setMode]);

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
  const activeCallIsAccepted = activeCall?.status === "accepted";

  useEffect(() => {
    if (activeCall?.id) setCallMinimized(false);
  }, [activeCall?.id]);

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
      markChatAsRead({ chatId: directConversationId, userId: sendId, email }).catch(() => {});
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
    markChatAsRead({ chatId: channelId }).catch(() => {});
    navigate(`${CHAT_APP_BASE_PATH}/${encodeURIComponent(channelId)}`);
  };

  const toggleGroupUser = (userId) => {
    setGroupUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((selectedId) => selectedId !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (creatingGroup) return;
    if (!groupTitle.trim()) {
      setGroupError("Enter a group name.");
      return;
    }
    if (groupUserIds.length === 0) {
      setGroupError("Select at least one person.");
      return;
    }

    setCreatingGroup(true);
    setGroupError("");

    try {
      const response = await createGroupChatService({
        title: groupTitle.trim(),
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

  const groupMembers = useMemo(
    () => allVisibleBuddies.filter((buddy) => {
      const search = groupSearch.trim().toLowerCase();
      if (!search) return true;
      return `${getBuddyName(buddy)} ${getBuddyEmail(buddy)}`.toLowerCase().includes(search);
    }),
    [allVisibleBuddies, groupSearch],
  );

  const selectedGroupMembers = useMemo(
    () => allVisibleBuddies.filter((buddy) => groupUserIds.includes(String(getBuddySendId(buddy)))),
    [allVisibleBuddies, groupUserIds],
  );

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
      allVisibleBuddies.filter(
        (buddy) => !selectedGroupParticipantIds.has(String(getBuddySendId(buddy))),
      ),
    [allVisibleBuddies, selectedGroupParticipantIds],
  );
  const selectedMentionableUsers = useMemo(() => {
    if (!selectedChat) return [];

    if (selectedChat.type !== "channel") {
      return selectedChat.raw ? [selectedChat.raw] : [];
    }

    const participants = Array.isArray(selectedChat.raw?.participants)
      ? selectedChat.raw.participants
      : [];
    const participantIds = new Set(
      participants
        .map((participant) => String(getBuddySendId(participant) || ""))
        .filter(Boolean),
    );

    return uniqueUsersByIdentity(
      allVisibleBuddies.filter((user) =>
        participantIds.has(String(getBuddySendId(user))),
      ),
    );
  }, [allVisibleBuddies, selectedChat, uniqueUsersByIdentity]);

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

  const handleToggleChatMute = (chatId) => {
    if (!chatId) return;

    setMutedChatIds((prev) => {
      const normalizedChatId = String(chatId);
      const next = prev.includes(normalizedChatId)
        ? prev.filter((id) => id !== normalizedChatId)
        : [...prev, normalizedChatId];

      updateChatSettingsService({ mutedChatIds: next }).catch(() => {
        setSendError("Chat notification setting could not be saved.");
      });
      return next;
    });
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat.chatId || selectedChat.id;
    const confirmed = await requestConfirmation({
      title: "Clear chat?",
      message: "Clear all messages from this chat for your account? Other participants will keep their history.",
      confirmLabel: "Clear chat",
    });
    if (!confirmed) return;

    try {
      await clearChatHistoryService(chatId);
      const clearedKeys = [
        selectedChat.id,
        selectedChat.chatId,
        selectedChat.raw?.id,
        selectedChat.raw?.chat_id,
        selectedChat.raw?.chatId,
        getChannelId(selectedChat.raw),
      ].filter(Boolean).map(String);
      clearedKeys.forEach((key) => {
        chatClearVersionsRef.current.set(
          key,
          (chatClearVersionsRef.current.get(key) || 0) + 1,
        );
      });
      setMessagesByChat((prev) => {
        const next = { ...prev };
        clearedKeys.forEach((key) => { next[key] = []; });
        return next;
      });
      setMessagePaginationByChat((prev) => ({
        ...prev,
        [selectedChat.id]: { hasMore: false, nextCursor: null },
      }));
      clearUnreadForChat({ chatId, userId: selectedChat.type === "person" ? selectedChat.id : "" });
      setChannels((prev) =>
        prev.map((item) => {
          const itemIds = [
            item?.id,
            item?.chat_id,
            item?.chatId,
            getChannelId(item),
          ].filter(Boolean).map(String);
          const selectedIds = [selectedChat.id, selectedChat.chatId]
            .filter(Boolean)
            .map(String);
          return itemIds.some((itemId) => selectedIds.includes(itemId))
            ? {
                ...item,
                lastMessage: null,
                last_message: null,
                lastMessageAt: null,
                last_message_at: null,
              }
            : item;
        }),
      );
      setBuddies((prev) =>
        prev.map((buddy) =>
          selectedChat.type === "person" && String(getBuddySendId(buddy)) === String(selectedChat.id)
            ? { ...buddy, lastMessage: null, last_message: null, lastMessageAt: null, last_message_at: null }
            : buddy,
        ),
      );
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
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
      setMutedChatIds((prev) => {
        const next = prev.filter((id) => id !== String(chatId));
        updateChatSettingsService({ mutedChatIds: next }).catch(() => {});
        return next;
      });
      setSelectedChat(null);
      navigate(CHAT_APP_BASE_PATH);
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleTransferOwnership = async (chatId, userId) => {
    if (!chatId || !userId) return;

    try {
      await transferGroupOwnershipService(chatId, userId);
      await fetchChatData();
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
    }
  };

  const handleRemoveGroupMember = async (chatId, userId) => {
    if (!chatId || !userId) return;
    try {
      await removeGroupMemberService(chatId, userId);
      await fetchChatData();
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
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
      // Keep profile uploads usable when S3 is temporarily unreachable.
      if (file.size <= 350_000) {
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const response = await updateChatAvatarUrlService(dataUrl);
          const updatedUser = response.data?.data?.user;
          const nextAvatarUrl = getImageUrl(updatedUser);
          setProfileUser((prev) => {
            const nextUser = { ...(prev || {}), ...(updatedUser || {}), avatarUrl: nextAvatarUrl, imageUrl: nextAvatarUrl };
            localStorage.setItem("user", JSON.stringify(nextUser));
            return nextUser;
          });
          setLoadError("");
          return;
        } catch (fallbackError) {
          setLoadError(normalizeChatError(fallbackError));
          return;
        }
      }
      setLoadError(normalizeChatError(error));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    const conversationIds = new Set([
      ...channels.map((channel) =>
        channel?.chat_id || channel?.chatId || getChannelId(channel),
      ),
      ...buddies.map((buddy) =>
        buddy?.directConversationId || buddy?.chat_id || buddy?.chatId,
      ),
      selectedChat?.chatId,
    ].filter(Boolean).map(String));

    const directUserIds = buddies
      .map((buddy) => String(getBuddySendId(buddy) || ""))
      .filter(Boolean);
    const openedConversationIds = await Promise.allSettled(
      directUserIds.map(async (userId) =>
        getConversationIdFromResponse(await openDirectChatService(userId)),
      ),
    );

    openedConversationIds.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        conversationIds.add(String(result.value));
      }
    });

    await Promise.allSettled(
      [...conversationIds].map((chatId) => markConversationReadService(chatId)),
    );

    clearAuthToken();
    sessionStorage.clear();
    localStorage.clear();
    setActiveCall(null);
    setIncomingCall(null);
    // Reload the app at the public route so no mounted chat effects can
    // continue using the previous authenticated session.
    window.location.replace("/login");
  };

  const handleStartConversationCall = async (type, options = {}) => {
    if ((!selectedChat && !options.chatId) || callStarting) return;
    if (selectedChat?.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setCallNotice("Unblock this user before starting a call.");
      return;
    }

    setCallStarting(true);
    setSendError("");
    setCallError("");

    try {
      let chatId =
        options.chatId ||
        (selectedChat?.type === "channel" ? selectedChat.id : selectedChat?.chatId);

      if (!chatId && selectedChat?.type === "person") {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId = getConversationIdFromResponse(openResponse);

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
      setCallMinimized(false);
      return;
    }

    try {
      await endConversationCallService(activeCall.chatId, activeCall.id);
    } catch (error) {
      setCallNotice(normalizeChatError(error));
    } finally {
      setActiveCall(null);
      setCallMinimized(false);
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
      [selectedChat.id]: filterBlockedMessages(normalizeChatMessages(
        messagesResponse.data?.data,
        selectedChat
      )),
    }));
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    const filesToSend = pendingFiles;
    if ((!text && filesToSend.length === 0) || !selectedChat || sending) return;
    if (selectedChat.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setSendError("Unblock this user before sending messages.");
      return;
    }
    const mentionedUsers = uniqueUsersByIdentity(selectedMentionableUsers)
      .filter((buddy) => {
        const name = getBuddyName(buddy);
        const email = getBuddyEmail(buddy);
        return textContainsMention(text, name) || textContainsMention(text, email);
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
        chatId = getConversationIdFromResponse(openResponse);

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

  const handleEnterToSendChange = (enabled) => {
    setEnterToSend(enabled);
    updateChatSettingsService({ enterToSend: enabled }).catch(() => {
      setSendError("Enter-to-send setting could not be saved.");
    });
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
    const messageAge = Date.now() - new Date(message.sentAt).getTime();
    if (!Number.isFinite(messageAge) || messageAge < 0 || messageAge > 10 * 60 * 1000) {
      setSendError("Messages can only be edited within 10 minutes.");
      return;
    }
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

  const handleDeleteMessages = async (messages = []) => {
    const messageList = Array.isArray(messages)
      ? messages
      : messages && typeof messages === "object"
        ? [messages]
        : [];

    if (!selectedChat || messageList.length === 0) return false;
    const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
    // Message IDs can come from REST, realtime events, or optimistic state.
    // Keep them as strings so the request and local state use the same key.
    const messageIds = messageList
      .map((message) => message?.id)
      .filter((messageId) => messageId !== null && messageId !== undefined && messageId !== "")
      .map(String);
    if (!chatId || messageIds.length === 0) return false;
    const confirmed = await requestConfirmation({
      title: messageIds.length === 1 ? "Delete message?" : "Delete messages?",
      message: `Delete ${messageIds.length === 1 ? "this message" : `${messageIds.length} messages`}? This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!confirmed) return false;

    try {
      const results = await Promise.allSettled(
        messageIds.map((messageId) => deleteConversationMessageService(chatId, messageId)),
      );
      const successfulIds = new Set();
      const deletedById = new Map();

      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const messageId = messageIds[index];
        successfulIds.add(messageId);
        const deletedMessage = normalizeRealtimeMessage(result.value.data?.data, {
          ...selectedChat,
          currentUserId,
        });
        if (deletedMessage) deletedById.set(String(deletedMessage.id), deletedMessage);
      });

      if (successfulIds.size === 0) {
        throw results.find((result) => result.status === "rejected")?.reason || new Error("Messages could not be deleted");
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [selectedChat.id]: (prev[selectedChat.id] || []).map((message) =>
          successfulIds.has(String(message.id))
            ? deletedById.get(String(message.id)) || {
              ...message,
              text: "This message was deleted",
              deletedAt: new Date().toISOString(),
              edited: false,
            }
            : message,
        ),
      }));

      if (successfulIds.size !== messageIds.length) {
        setSendError(`${messageIds.length - successfulIds.size} message(s) could not be deleted.`);
      }
      return true;
    } catch (error) {
      setSendError(normalizeChatError(error));
      return false;
    }
  };

  const handleBlockUser = async (message) => {
    const userId = message?.authorId;
    if (!userId) return;
    const isBlocked = blockedUserIds.includes(String(userId));
    const confirmed = await requestConfirmation({
      title: isBlocked ? "Unblock user?" : "Block user?",
      message: isBlocked
        ? "Allow messages from this user again?"
        : "You will no longer receive messages from this user.",
      confirmLabel: isBlocked ? "Unblock" : "Block",
    });
    if (!confirmed) return;

    try {
      setBlockedUserIds((prev) => {
        const next = isBlocked
          ? prev.filter((id) => id !== String(userId))
          : [...prev, String(userId)];
        updateChatSettingsService({ blockedUserIds: next }).catch(() => {
          setSendError("Blocked-user setting could not be saved.");
        });
        return next;
      });
      if (!isBlocked) {
        setMessagesByChat((prev) => Object.fromEntries(
          Object.entries(prev).map(([chatKey, messages]) => [
            chatKey,
            messages.filter((item) => String(item.authorId) !== String(userId)),
          ]),
        ));
      }
      setSendError(isBlocked ? "User unblocked." : "User blocked.");
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleCopyMessage = async (message) => {
    const text = String(message?.text || "").trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setSendError("Message copied.");
    } catch {
      setSendError("Unable to copy message.");
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
        className="chat-shell"
        sx={{
          height: standalone ? "100dvh" : "calc(100dvh - 48px)",
          minHeight: standalone ? "100dvh" : { xs: 0, md: 620 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "320px minmax(0, 1fr)", md: "380px minmax(0, 1fr)" },
          bgcolor: "var(--chat-canvas)",
          border: standalone ? "none" : "1px solid",
          borderColor: "divider",
          borderRadius: standalone ? 0 : 3,
          boxShadow: standalone ? "none" : "0 18px 50px rgba(35,42,70,.12)",
          overflow: "hidden",
        }}
      >
      <ChatSidebar
        avatarUploading={avatarUploading}
        currentStatus={currentStatus}
        enterToSend={enterToSend}
        onEnterToSendChange={handleEnterToSendChange}
        filteredItems={filteredItems}
        loadError={loadError}
        loading={loading}
        onAvatarUpload={handleAvatarUpload}
        onCreateGroup={() => navigate(`${CHAT_APP_BASE_PATH}/groups/new`)}
        settingsPage={settingsPage}
        onSettingsOpen={() => {
          setSelectedChat(null);
          navigate(`${CHAT_APP_BASE_PATH}/settings`);
        }}
        onSettingsClose={() => navigate(CHAT_APP_BASE_PATH)}
        onClearSelectedChat={() => setSelectedChat(null)}
        onRefresh={fetchChatData}
        onSelectBuddy={selectBuddy}
        onSelectChannel={selectChannel}
        onStartCallFromHistory={({ chatId, type }) =>
          handleStartConversationCall(type || "audio", { chatId })
        }
        onStatusChange={handleStatusChange}
        searchTerm={searchTerm}
        selectedChat={selectedChat}
        statusSaving={statusSaving}
        callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
        currentUser={currentUser}
        totalUnreadCount={totalUnreadCount}
        setSearchTerm={setSearchTerm}
        setTab={setTab}
      />
      {adminPage ? <AdminPage embedded /> : <ChatWindow
        activeCall={activeCallIsAccepted ? null : activeCall}
        callSocketRef={callSocketRef}
        chatBoxRef={chatBoxRef}
        callStarting={callStarting || Boolean(activeCall) || Boolean(incomingCall)}
        availableChats={conversationItems}
        currentUser={currentUser}
        messageInfoVersions={messageInfoVersions}
        editingMessage={editingMessage}
        enterToSend={enterToSend}
        currentMessages={currentMessages}
        typingUser={typingUsersByChat[String(selectedChat?.chatId || selectedChat?.id)]}
        onTyping={(typing) => callSocketRef.current?.emit("typing:update", { chatId: selectedChat?.chatId || selectedChat?.id, typing })}
        hasOlderMessages={Boolean(messagePaginationByChat[selectedChat?.id]?.hasMore)}
        loadingOlderMessages={loadingOlderMessages}
        onLoadOlderMessages={loadOlderMessages}
        handleFileUpload={handleFileUpload}
        handleCancelComposerMode={handleCancelComposerMode}
        handleEditMessage={handleEditMessage}
        handleForwardMessage={handleForwardMessage}
        handlePinMessage={handlePinMessage}
        handleDeleteMessages={handleDeleteMessages}
        handleBlockUser={handleBlockUser}
        blockedUserIds={blockedUserIds}
        handleCopyMessage={handleCopyMessage}
        handleReaction={handleReaction}
        handleReplyToMessage={handleReplyToMessage}
        handleSend={handleSend}
        onEndActiveCall={handleEndActiveCall}
        onLeaveGroup={handleLeaveGroup}
        onTransferOwnership={handleTransferOwnership}
        onRemoveGroupMember={handleRemoveGroupMember}
        inputValue={inputValue}
        mutedGroupIds={mutedChatIds}
        mentionableUsers={selectedMentionableUsers}
        pendingFiles={pendingFiles}
        removePendingFile={removePendingFile}
        selectedChat={selectedChat}
        sendError={sendError}
        sending={sending}
        replyToMessage={replyToMessage}
        onStartConversationCall={handleStartConversationCall}
        onOpenAddMembers={openAddMembersDialog}
        onToggleGroupMute={handleToggleChatMute}
        onLogout={handleLogout}
        onClearChat={handleClearChat}
        setInputValue={setInputValue}
        setSelectedChat={setSelectedChat}
        uploading={uploading}
      />}
      </Box>
      <IncomingCallDialog
        call={incomingCall}
        error={callError}
        responding={callResponding}
        onAccept={() => handleRespondToCall("accept")}
        onDecline={() => handleRespondToCall("decline")}
      />
      <Dialog
        open={Boolean(activeCallIsAccepted && !callMinimized)}
        keepMounted
        disableEscapeKeyDown
        onClose={() => {}}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            borderRadius: 2,
            overflow: "hidden",
            width: { xs: "calc(100vw - 24px)", sm: "calc(100vw - 48px)" },
            maxWidth: 1280,
            m: { xs: 1.5, sm: 3 },
          },
        }}
      >
        <InternalCallPanel
          activeCall={activeCall}
          currentUser={currentUser}
          modal
          onMinimize={() => setCallMinimized(true)}
          onEnd={handleEndActiveCall}
          socketRef={callSocketRef}
        />
      </Dialog>
      {activeCallIsAccepted && callMinimized && (
        <Box
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 24 },
            bottom: { xs: 12, sm: 24 },
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            bgcolor: "#0f172a",
            color: "#fff",
            borderRadius: 2,
            boxShadow: "0 12px 35px rgba(0,0,0,.35)",
          }}
        >
          <Box sx={{ minWidth: 0, mr: 1 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
              {activeCall?.type === "video" ? "Video call" : "Voice call"}
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap>
              Call in progress
            </Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={() => setCallMinimized(false)} sx={{ color: "#fff", borderColor: "#64748b" }}>
            Restore
          </Button>
          <Button size="small" variant="contained" color="error" onClick={handleEndActiveCall}>
            End
          </Button>
        </Box>
      )}
      <Snackbar
        open={Boolean(callNotice)}
        autoHideDuration={6000}
        onClose={() => setCallNotice("")}
        message={callNotice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
      <Dialog
        open={Boolean(confirmationDialog)}
        onClose={() => closeConfirmation(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {confirmationDialog?.title}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {confirmationDialog?.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => closeConfirmation(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmationDialog?.confirmColor || "error"}
            onClick={() => closeConfirmation(true)}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
          >
            {confirmationDialog?.confirmLabel || "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
      <GroupCreationDialog
        open={groupDialogOpen || groupPage}
        page={groupPage}
        onClose={() => {
          setGroupDialogOpen(false);
          if (groupPage) navigate(CHAT_APP_BASE_PATH);
        }}
        onCreate={handleCreateGroup}
        onSearchChange={setGroupSearch}
        onSelectMember={toggleGroupUser}
        onTitleChange={setGroupTitle}
        members={groupMembers}
        selectedMembers={selectedGroupMembers}
        search={groupSearch}
        title={groupTitle}
        error={groupError}
        creating={creatingGroup}
      />
      <AddMembersDialog
        open={addMembersDialogOpen}
        onClose={() => setAddMembersDialogOpen(false)}
        onAdd={handleAddGroupMembers}
        onSelect={toggleAddMemberUser}
        members={addableGroupMembers}
        selectedIds={addMemberUserIds}
        error={addMembersError}
        adding={addingMembers}
      />
      <Dialog
        open={false}
        onClose={() => setGroupDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ bgcolor: "primary.main", width: 42, height: 42 }}>
              <GroupIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>New group</Typography>
              <Typography variant="body2" color="text.secondary">
                Add people and choose a group name
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <TextField
            fullWidth
            autoFocus
            label="Group name"
            placeholder="Enter a group name"
            size="medium"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            inputProps={{ maxLength: 80 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 0.75, fontWeight: 700 }}>
            Selected members {groupUserIds.length ? `(${groupUserIds.length})` : ""}
          </Typography>
          {selectedGroupMembers.length > 0 ? (
            <Box display="flex" gap={0.75} flexWrap="wrap" sx={{ mb: 1.5 }}>
              {selectedGroupMembers.map((buddy) => {
                const userId = String(getBuddySendId(buddy));
                return (
                  <Chip
                    key={userId}
                    avatar={<Avatar src={getImageUrl(buddy)}>{getInitial(getBuddyName(buddy))}</Avatar>}
                    label={getBuddyName(buddy)}
                    onDelete={() => toggleGroupUser(userId)}
                    sx={{ maxWidth: "100%" }}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Select at least one person to start the group.
            </Typography>
          )}
          <TextField
            fullWidth
            size="small"
            placeholder="Search people"
            value={groupSearch}
            onChange={(event) => setGroupSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {groupError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {groupError}
            </Alert>
          )}
          <List sx={{ maxHeight: 310, overflow: "auto", mt: 1, p: 0 }}>
            {groupMembers.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              const checked = groupUserIds.includes(userId);

              return (
                <ListItemButton
                  key={userId}
                  onClick={() => toggleGroupUser(userId)}
                  sx={{ borderRadius: 2, mb: 0.25, px: 1, "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Avatar src={getImageUrl(buddy)} sx={{ width: 42, height: 42, mr: 1.25 }}>
                    {getInitial(getBuddyName(buddy))}
                  </Avatar>
                  <ListItemText
                    primary={getBuddyName(buddy)}
                    secondary={getBuddyEmail(buddy)}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                  <Checkbox checked={checked} tabIndex={-1} disableRipple />
                </ListItemButton>
              );
            })}
            {groupMembers.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
                No people found.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Button onClick={() => setGroupDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={creatingGroup || groupUserIds.length === 0}
            sx={{ borderRadius: 2, textTransform: "none", px: 2.5, fontWeight: 700 }}
          >
            {creatingGroup ? "Creating…" : "Create group"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={false}
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
