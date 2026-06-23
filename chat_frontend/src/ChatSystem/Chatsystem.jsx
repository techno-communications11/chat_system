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

export default function ChatSystem({ standalone = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const chatBoxRef = useRef(null);
  const initialFetchStartedRef = useRef(false);
  const loadedChatHistoryRef = useRef(new Set());

  const [tab, setTab] = useState("people");
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupUserIds, setGroupUserIds] = useState([]);
  const [groupError, setGroupError] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("online");
  const [statusSaving, setStatusSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileUser, setProfileUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const currentUser = profileUser;
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || ""
  );

  const activeConversationId =
    selectedChat?.type === "channel"
      ? selectedChat.id
      : selectedChat?.chatId || null;

  const totalUnreadCount = useMemo(
    () => channels.reduce((total, channel) => total + getUnreadCount(channel), 0),
    [channels],
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

  const loadDirectChatHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "person" || !chat.id) return;

    loadedChatHistoryRef.current.add(chat.id);

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
  }, []);

  const loadChannelHistory = useCallback(async (chat) => {
    if (!chat || chat.type !== "channel" || !chat.id) return;

    loadedChatHistoryRef.current.add(chat.id);

    try {
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
  }, []);

  const fetchChatData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [buddyResponse, channelResponse, statusResponse] = await Promise.all([
        getChatUsersService(),
        getChatConversationsService(),
        getChatStatusService().catch(() => null),
      ]);

      const chatUsers = getArrayPayload(buddyResponse.data?.data);
      const chatConversations = getArrayPayload(channelResponse.data?.data);

      setBuddies(chatUsers);
      setChannels(chatConversations);
      setCurrentStatus(
        statusResponse?.data?.data?.user?.presence ||
          statusResponse?.data?.data?.user?.status ||
          "online",
      );

      if (id && !selectedChat) {
        const decodedId = decodeURIComponent(id);
        const buddy = chatUsers.find((item) =>
          [getBuddySendId(item), getBuddyEmail(item)].some(
            (value) => String(value) === decodedId
          )
        );
        const channel = chatConversations.find(
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
          setTab("people");
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
          setTab("channels");
        }
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, id, selectedChat]);

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

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (tab === "channels") {
      return channels.filter((channel) => {
        const name = getChannelName(channel).toLowerCase();
        const key = getChannelId(channel).toLowerCase();
        return !term || name.includes(term) || key.includes(term);
      });
    }

    return buddies.filter((buddy) => {
      const name = getBuddyName(buddy).toLowerCase();
      const email = getBuddyEmail(buddy).toLowerCase();
      return !term || name.includes(term) || email.includes(term);
    });
  }, [buddies, channels, searchTerm, tab]);

  const currentMessages = selectedChat
    ? messagesByChat[selectedChat.id] || []
    : [];

  const selectBuddy = (buddy) => {
    const email = getBuddyEmail(buddy);
    const sendId = getBuddySendId(buddy);
    if (!sendId) return;

    const chat = {
      type: "person",
      source: "local",
      id: sendId,
      title: getBuddyName(buddy),
      subtitle: email,
      raw: buddy,
      imageUrl: getImageUrl(buddy),
      currentUserId,
    };

    setSelectedChat(chat);
    setSendError("");
    loadedChatHistoryRef.current.delete(sendId);
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
    setChannels((prev) =>
      prev.map((item) =>
        getChannelId(item) === channelId ? { ...item, unreadCount: 0 } : item,
      ),
    );
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
      setTab("channels");
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
      const avatarUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file"));
        reader.readAsDataURL(file);
      });

      const response = await updateChatAvatarService(avatarUrl);
      const updatedUser = response.data?.data?.user;
      const nextAvatarUrl = getImageUrl(updatedUser) || String(avatarUrl);

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

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length || !selectedChat || uploading) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });

    setUploading(true);
    setSendError("");

    try {
      let chatId =
        selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;

      if (selectedChat.type === "person" && !chatId) {
        const openResponse = await openDirectChatService(selectedChat.id);
        chatId =
          openResponse.data?.data?.chat_id ||
          openResponse.data?.data?.data?.chat_id ||
          null;
      }

      if (selectedChat.type === "channel") {
        await shareConversationFileService(selectedChat.id, formData);
      } else if (chatId) {
        await shareConversationFileService(chatId, formData);
        setSelectedChat((prev) =>
          prev?.id === selectedChat.id ? { ...prev, chatId } : prev
        );
      }

      if (chatId) {
        const messagesResponse = await getChatMessagesService(chatId);
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChat.id]: normalizeChatMessages(
            messagesResponse.data?.data,
            selectedChat
          ),
        }));
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !selectedChat || sending) return;
    const mentionedUsers = buddies
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
    setSendError("");

    try {
      if (selectedChat.type === "channel") {
        await sendConversationMessageService(selectedChat.id, text, messageOptions);
        const messagesResponse = await getChatMessagesService(selectedChat.id);
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChat.id]: normalizeChatMessages(
            messagesResponse.data?.data,
            selectedChat
          ),
        }));
      } else {
        const response = selectedChat.chatId
          ? await sendConversationMessageService(selectedChat.chatId, text, messageOptions)
          : await sendDirectMessageService(selectedChat.id, text, messageOptions);
        const data = response.data?.data;
        const chatId =
          data?.chatId ||
          data?.chat?.chat_id ||
          data?.chat?.data?.chat_id ||
          selectedChat.chatId ||
          null;
        const historyPayload = data?.messages || data;
        const normalizedMessages = normalizeChatMessages(
          historyPayload,
          selectedChat
        );

        if (chatId) {
          setSelectedChat((prev) =>
            prev?.id === selectedChat.id ? { ...prev, chatId } : prev
          );
        }

        if (normalizedMessages.length > 0) {
          setMessagesByChat((prev) => ({
            ...prev,
            [selectedChat.id]: normalizedMessages,
          }));
        } else if (chatId) {
          const messagesResponse = await getChatMessagesService(chatId);
          setMessagesByChat((prev) => ({
            ...prev,
            [selectedChat.id]: normalizeChatMessages(
              messagesResponse.data?.data,
              selectedChat
            ),
          }));
        }
      }
      setInputValue("");
    } catch (error) {
      setSendError(normalizeChatError(error));
    } finally {
      setSending(false);
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
        tab={tab}
      />
      <ChatWindow
        chatBoxRef={chatBoxRef}
        currentMessages={currentMessages}
        handleFileUpload={handleFileUpload}
        handleReaction={handleReaction}
        handleSend={handleSend}
        inputValue={inputValue}
        mentionableUsers={buddies}
        selectedChat={selectedChat}
        sendError={sendError}
        sending={sending}
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
            {buddies.map((buddy) => {
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
    </>
  );
}
