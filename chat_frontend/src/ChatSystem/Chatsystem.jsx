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
import {
  getChatMessagesService,
  getChatStatusService,
  getChatUsersService,
  getChatConversationsService,
  addGroupMembersService,
  addMessageReactionService,
  createGroupChatService,
  markConversationReadService,
  openDirectChatService,
  removeMessageReactionService,
  sendConversationMessageService,
  sendDirectMessageService,
  shareConversationFileService,
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

  const [, setTab] = useState("conversations");
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [inputValue, setInputValue] = useState("");
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

  const uniqueUsersByIdentity = useCallback((users = []) => {
    const seen = new Set();

    return users.filter((user) => {
      const key = String(getBuddySendId(user) || getBuddyEmail(user) || getBuddyName(user))
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

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
    () => buddies.filter((buddy) => !isCurrentUserRecord(buddy)),
    [buddies, isCurrentUserRecord],
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
        const matchingDirectConversation = visibleDirectChannels.find((channel) => {
          const participants = Array.isArray(channel?.participants)
            ? channel.participants
            : [];

          return participants.some((participant) => {
            const participantId = String(getBuddySendId(participant));
            const participantEmail = String(getBuddyEmail(participant)).toLowerCase();
            return (
              (buddyId && participantId === buddyId) ||
              (buddyEmail && participantEmail === buddyEmail)
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
    () =>
      conversationItems.reduce((total, item) => total + getUnreadCount(item), 0),
    [conversationItems],
  );

  const handleRealtimeMessage = useCallback(
    ({ chatId, message }) => {
      if (!chatId || !message) return;

      const senderId = getMessageSenderId(message);
      const isOwnMessage = senderId && senderId === currentUserId;
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

      setChannels((prev) =>
        prev.map((channel) => {
          const channelId = String(getChannelId(channel));
          const conversationId = String(
            channel?.chat_id || channel?.chatId || channel?.id || "",
          );

          if (channelId !== String(chatId) && conversationId !== String(chatId)) {
            return channel;
          }

          return {
            ...channel,
            unreadCount: isActiveChat || isOwnMessage ? 0 : getUnreadCount(channel) + 1,
            lastMessage: message,
          };
        }),
      );

      if (!isOwnMessage && (!isActiveChat || document.hidden)) {
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

      if (isActiveChat && !isOwnMessage) {
        markConversationReadService(chatId).catch(() => {});
      }
    },
    [buddies, channels, currentUserId, navigate, selectedChat],
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

  useChatRealtime({
    enabled: Boolean(currentUserId),
    activeConversationId,
    onMessage: handleRealtimeMessage,
    onPresence: handleRealtimePresence,
    onAvatar: handleRealtimeAvatar,
  });

  useEffect(() => {
    requestChatNotificationPermission().catch(() => {});
  }, []);

  const clearUnreadForChat = useCallback(({ chatId, userId, email } = {}) => {
    const normalizedChatId = String(chatId || "");
    const normalizedUserId = String(userId || "");
    const normalizedEmail = String(email || "").toLowerCase();

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

  const handleStatusChange = async (presence) => {
    if (statusSaving) return;

    setStatusSaving(true);
    setCurrentStatus(presence);

    try {
      await updateChatStatusService(presence);
      await fetchChatData();
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
    const messageOptions = mentionedUsers.length
      ? { metadata: { mentions: mentionedUsers } }
      : {};

    setSending(true);
    setUploading(filesToSend.length > 0);
    setSendError("");

    try {
      let chatId =
        selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

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
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    if (!selectedChat || !messageId || !emoji) return;
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

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChat.id]: (prev[selectedChat.id] || []).map((message) => {
        if (String(message.id) !== String(messageId)) return message;

        const reactions = message.reactions || [];
        const existingReaction = reactions.find(
          (reaction) => reaction.emoji === emoji
        );

        return {
          ...message,
          reactions: existingReaction
            ? reactions.filter((reaction) => reaction.emoji !== emoji)
            : [...reactions, { emoji, count: 1, reacted: true }],
        };
      }),
    }));
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
        chatBoxRef={chatBoxRef}
        currentMessages={currentMessages}
        handleFileUpload={handleFileUpload}
        handleReaction={handleReaction}
        handleSend={handleSend}
        inputValue={inputValue}
        mentionableUsers={selectedMentionableUsers}
        pendingFiles={pendingFiles}
        removePendingFile={removePendingFile}
        selectedChat={selectedChat}
        sendError={sendError}
        sending={sending}
        onOpenAddMembers={openAddMembersDialog}
        setInputValue={setInputValue}
        setSelectedChat={setSelectedChat}
        uploading={uploading}
      />
      </Box>
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
