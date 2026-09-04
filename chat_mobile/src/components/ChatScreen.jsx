import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { API_URL, APP_NAME, TOKEN_KEY, USER_KEY, api, dataOf, chatIdOf, titleOf, textOf, idOf, authHeaders, requestOptions, messageIdOf, userIdOf } from "../mobileConfig";
import { styles } from "../mobileStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MobileCallPanel } from "./MobileCallPanel";

const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const attachmentsOf = (message) => {
  const metadata = message?.metadata || {};
  const content = message?.content || {};
  const files = [
    metadata.file,
    metadata.attachment,
    content.file,
    content.attachment,
    ...(Array.isArray(metadata.files) ? metadata.files : []),
    ...(Array.isArray(metadata.attachments) ? metadata.attachments : []),
    ...(Array.isArray(content.files) ? content.files : []),
    ...(Array.isArray(content.attachments) ? content.attachments : []),
  ].filter(Boolean);
  if (metadata.type === "file" && files.length === 0) files.push(metadata);
  return files.map((file, index) => ({
    ...file,
    name: file.name || file.fileName || file.file_name || file.originalName || "Document",
    url: file.url || file.fileUrl || file.file_url || file.downloadUrl || file.download_url || file.publicUrl || file.public_url || "",
    contentType: file.contentType || file.content_type || file.mimeType || file.mime_type || metadata.contentType || "",
    id: file.id || file.key || file.url || `${file.name || "file"}-${index}`,
  }));
};

function ChatScreen({ token, user, chat, conversations = [], darkTheme = false, onBack, enterToSend = false }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [availability, setAvailability] = useState(chat?.presence || chat?.status || chat?.participant?.presence || chat?.participant?.status || "offline");
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [callBusy, setCallBusy] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [conversationOptionsOpen, setConversationOptionsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactionPickerMessage, setReactionPickerMessage] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [mutedChatIds, setMutedChatIds] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [groupMembers, setGroupMembers] = useState(() => chat?.participants || chat?.members || []);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const chatId = chatIdOf(chat);
  const requestConfig = useMemo(
    () => ({ headers: authHeaders(token) }),
    [token],
  );
  const showDialog = (title, message, buttons = [{ text: "Close" }]) => setDialog({ title, message, buttons });
  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const result = await api.get(
        `/chat-service/conversations/${encodeURIComponent(chatId)}/messages`,
        requestConfig,
      );
      const data = dataOf(result);
      setMessages(
        data.messages || data.data || (Array.isArray(data) ? data : []),
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to load messages.",
      );
    } finally {
      setLoading(false);
    }
  }, [chatId, requestConfig]);
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);
  useEffect(() => {
    api.get("/chat-service/me/settings", requestConfig)
      .then((result) => {
        const settings = dataOf(result);
        setMutedChatIds((settings.mutedChatIds || []).map(String));
        setBlockedUserIds((settings.blockedUserIds || []).map(String));
      })
      .catch(() => {});
  }, [requestConfig]);
  useEffect(() => {
    if (!chatId) return;
    api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/read`, {}, requestConfig).catch(() => {});
  }, [chatId, requestConfig, messages.length]);
  useEffect(() => {
    if (!chatId) return undefined;
    const socket = io(API_URL, {
      auth: { token, appName: APP_NAME },
      transports: ["polling", "websocket"],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 15000,
    });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join:conversation", chatId));
    socket.on("typing:update", (payload) => {
      if (String(payload?.chatId || payload?.chat_id) !== String(chatId) || String(payload?.userId) === String(userIdOf(user))) return;
      setTypingUser(payload.typing ? (payload.name || "Someone") : null);
    });
    socket.on("message:read", (payload) => {
      if (String(payload?.chatId || payload?.chat_id) !== String(chatId)) return;
      setMessages((current) => current.map((item) => {
        const senderId = userIdOf(item?.sender || item);
        return String(senderId) === String(userIdOf(user)) ? { ...item, deliveryStatus: "seen" } : item;
      }));
    });
    socket.on("presence:update", (payload) => {
      const participantIds = [chat?.userId, chat?.user_id, chat?.participant?.id, chat?.participant?.userId, chat?.otherUser?.id, ...(chat?.participants || []).map((participant) => userIdOf(participant))].filter(Boolean).map(String);
      if (participantIds.includes(String(payload?.userId || payload?.user?.id))) setAvailability(payload?.presence || payload?.status || payload?.user?.presence || "offline");
    });
    socket.on("message:new", (payload) => {
      if (
        String(payload?.chatId || payload?.chat_id) !== chatId ||
        !payload?.message
      )
        return;
      setMessages((current) =>
        current.some(
          (item, index) => idOf(item, index) === idOf(payload.message, -1),
        )
          ? current
          : [...current, payload.message],
      );
      const senderId = userIdOf(payload.message?.sender || payload.message);
      const currentUserId = userIdOf(user);
      if (senderId && currentUserId && senderId === currentUserId) return;
      if (Constants.appOwnership !== "expo") {
        api.get("/chat-service/me/settings", requestConfig).then((settingsResult) => {
          if (dataOf(settingsResult).desktopNotifications === false) return null;
          return import("expo-notifications").then(({ default: Notifications, ...module }) =>
          (Notifications || module).scheduleNotificationAsync({
            content: {
              title: titleOf(chat),
              body: textOf(payload.message) || "New attachment",
              data: { chatId },
            },
            trigger: null,
          }));
        }).catch(() => {});
      }
    });
    const callMatchesChat = (payload) => String(payload?.chatId || payload?.chat_id || payload?.call?.chatId || payload?.call?.chat_id) === String(chatId);
    socket.on("call:ringing", (payload) => { if (callMatchesChat(payload) && payload.call) setIncomingCall(payload.call); });
    socket.on("call:accepted", (payload) => { if (callMatchesChat(payload)) { setIncomingCall(null); setActiveCall(payload.call); } });
    ["declined", "missed", "ended", "cancelled"].forEach((status) => socket.on(`call:${status}`, (payload) => { if (callMatchesChat(payload)) { setIncomingCall(null); setActiveCall(null); } }));
    return () => {
      socketRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("leave:conversation", chatId);
      socket.disconnect();
    };
  }, [chatId, token, user, chat]);
  const updateDraftText = (value) => {
    setText(value);
    if (!socketRef.current?.connected || !chatId) return;
    socketRef.current.emit("typing:update", { chatId, typing: Boolean(value.trim()) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.trim()) typingTimeoutRef.current = setTimeout(() => socketRef.current?.emit("typing:update", { chatId, typing: false }), 2500);
  };
  const respondToCall = async (call, action) => {
    setCallBusy(true);
    try {
      await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(call.id)}/respond`, { action }, requestConfig);
      setIncomingCall(null);
      if (action === "accept") setActiveCall(call);
    } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to respond to call."); }
    finally { setCallBusy(false); }
  };
  const endCall = async () => {
    if (!activeCall?.id) return;
    try { await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(activeCall.id)}/end`, {}, requestConfig); setActiveCall(null); }
    catch (requestError) { setError(requestError?.response?.data?.message || "Unable to end call."); }
  };
  const send = async () => {
    const value = text.trim();
    if (!value || sending || !chatId) return;
    setSending(true);
    setError("");
    try {
      if (editingMessage) {
        await api.patch(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageIdOf(editingMessage))}`, { text: value }, requestConfig);
      } else {
        await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages`, { text: value, ...(replyTo ? { replyToMessageId: messageIdOf(replyTo) } : {}) }, requestConfig);
      }
      setText("");
      socketRef.current?.emit("typing:update", { chatId, typing: false });
      setReplyTo(null);
      setEditingMessage(null);
      loadMessages();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  };
  const toggleMessageSelection = (message) => {
    const messageId = messageIdOf(message);
    if (!messageId) return;
    setSelectedMessageIds((current) => current.includes(String(messageId))
      ? current.filter((id) => id !== String(messageId))
      : [...current, String(messageId)]);
  };
  const deleteSelectedMessages = () => {
    showDialog("Delete selected messages?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await Promise.all(selectedMessageIds.map((id) => api.delete(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(id)}`, requestConfig)));
          setSelectedMessageIds([]);
          loadMessages();
        } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to delete messages."); }
      } },
    ]);
  };
  const addEmoji = (emoji) => {
    if (reactionPickerMessage) {
      reactToMessage(reactionPickerMessage, emoji);
      setReactionPickerMessage(null);
    } else setText((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  };
  const applyTextFormat = (marker) => {
    const value = text.trim();
    if (value) setText(`${marker}${value}${marker}`);
  };
  const forwardToConversation = async (target) => {
    if (!forwardMessage || !target) return;
    try {
      await api.post(`/chat-service/conversations/${encodeURIComponent(chatIdOf(target))}/messages`, {
        text: textOf(forwardMessage) || "Attachment",
        metadata: { forwardedFrom: messageIdOf(forwardMessage) },
      }, requestConfig);
      setForwardMessage(null);
      showDialog("Forwarded", `Message sent to ${titleOf(target)}.`);
    } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to forward message."); }
  };
  const openMessageInfo = async (message) => {
    setInfoMessage({ ...message, readBy: [], deliveredTo: [] });
    setInfoLoading(true);
    try {
      const result = await api.get(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageIdOf(message))}/info`, requestConfig);
      const info = dataOf(result);
      setInfoMessage({ ...message, ...info });
    } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to load message info."); }
    finally { setInfoLoading(false); }
  };
  const reactToMessage = async (message, emoji) => {
    try {
      await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageIdOf(message))}/reactions`, { emoji }, requestConfig);
      setActionMessage(null);
      loadMessages();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to react to message."); }
  };
  const toggleMessagePin = async (message) => {
    try {
      await api.patch(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageIdOf(message))}/pin`, { pinned: !message?.metadata?.pinned }, requestConfig);
      setActionMessage(null);
      loadMessages();
    } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to update pin."); }
  };
  const messageAction = (message) => {
    const messageId = messageIdOf(message);
    if (!messageId) return;
    setActionMessage(message);
    return;
    const mine = String(userIdOf(message?.sender || message)) === String(userIdOf(user));
    showDialog("Message actions", "Choose an action", [
      { text: "Message info", onPress: async () => { try { const result = await api.get(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/info`, requestConfig); const info = dataOf(result); showDialog("Message info", `Sent: ${message?.createdAt || message?.timestamp || "Unknown"}\nRead by: ${info.readBy?.length || info.read_by?.length || 0}\nDelivered to: ${info.deliveredTo?.length || info.delivered_to?.length || 0}`); } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to load message info."); } } },
      { text: "Copy / share", onPress: () => Share.share({ message: textOf(message) || "Attachment" }) },
      ...(mine ? [{ text: "Select", onPress: () => toggleMessageSelection(message) }] : []),
      { text: "Reply", onPress: () => setReplyTo(message) },
      ...(mine ? [{ text: "Edit", onPress: () => { setEditingMessage(message); setText(textOf(message)); } }] : []),
      { text: "Forward", onPress: () => setForwardMessage(message) },
      { text: "React ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â", onPress: async () => { await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/reactions`, { emoji: "ÃƒÂ°Ã…Â¸Ã¢â‚¬ËœÃ‚Â" }, requestConfig); loadMessages(); } },
      ...REACTION_OPTIONS.map((emoji) => ({ text: `React ${emoji}`, onPress: async () => { try { await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/reactions`, { emoji }, requestConfig); loadMessages(); } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to react to message."); } } })),
      { text: message?.metadata?.pinned ? "Unpin" : "Pin", onPress: async () => { await api.patch(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`, { pinned: !message?.metadata?.pinned }, requestConfig); loadMessages(); } },
      ...(mine ? [{ text: "Delete", style: "destructive", onPress: () => showDialog("Delete message?", "This cannot be undone.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await api.delete(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`, requestConfig); loadMessages(); } }]) }] : []),
      { text: "Cancel", style: "cancel", onPress: () => setActionMessage(null) },
    ]);
  };
  const startCall = async (type) => {
    setCallBusy(true);
    try {
      const result = await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/calls`, { type }, requestConfig);
      const call = dataOf(result).call || dataOf(result);
      if (call?.id) setActiveCall({ ...call, chatId, status: call.status || "ringing" });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to start call.");
    } finally {
      setCallBusy(false);
    }
  };
  // Direct conversations also include a participants array. Only the
  // conversation type identifies a group; checking participants made direct
  // chats show group-only actions.
  const conversationType = String(chat?.type || chat?.conversationType || chat?.conversation_type || "").toLowerCase();
  const isGroup = conversationType === "group" || conversationType === "channel";
  const isGroupConversation = conversationType === "group";
  useEffect(() => {
    setGroupMembers(chat?.participants || chat?.members || []);
  }, [chat]);
  const currentGroupMember = groupMembers.find(
    (participant) => String(userIdOf(participant)) === String(userIdOf(user)),
  );
  const groupRole = String(currentGroupMember?.conversationRole || currentGroupMember?.role || "").toLowerCase();
  // The API permits both owners and admins to manage group membership.
  const canTransferGroupOwnership = ["owner", "admin"].includes(groupRole);
  const muted = mutedChatIds.includes(String(chatId));
  const directContactId = (chat?.participants || [])
    .map((participant) => userIdOf(participant))
    .find((participantId) => participantId && participantId !== userIdOf(user));
  const blocked = directContactId && blockedUserIds.includes(String(directContactId));
  const updateSettings = async (nextMuted, nextBlocked) => {
    await api.patch("/chat-service/me/settings", {
      mutedChatIds: nextMuted,
      blockedUserIds: nextBlocked,
    }, requestConfig);
  };
  const toggleMute = async () => {
    const next = muted ? mutedChatIds.filter((id) => id !== String(chatId)) : [...mutedChatIds, String(chatId)];
    try { await updateSettings(next, blockedUserIds); setMutedChatIds(next); setConversationOptionsOpen(false); }
    catch (requestError) { setError(requestError?.response?.data?.message || "Unable to update notifications."); }
  };
  const toggleBlock = async () => {
    if (!directContactId) return;
    const next = blocked ? blockedUserIds.filter((id) => id !== String(directContactId)) : [...blockedUserIds, String(directContactId)];
    try { await updateSettings(mutedChatIds, next); setBlockedUserIds(next); setConversationOptionsOpen(false); }
    catch (requestError) { setError(requestError?.response?.data?.message || "Unable to update blocked users."); }
  };
  const clearHistory = () => {
    setConversationOptionsOpen(false);
    showDialog("Clear all messages?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { try { await api.delete(`/chat-service/conversations/${encodeURIComponent(chatId)}/messages`, requestConfig); setMessages([]); } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to clear history."); } } },
    ]);
  };
  const leaveConversation = () => {
    setConversationOptionsOpen(false);
    showDialog("Leave conversation?", "You will no longer receive messages here.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: async () => { try { await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/leave`, {}, requestConfig); onBack(); } catch (requestError) { setError(requestError?.response?.data?.message || "Unable to leave conversation."); } } },
    ]);
  };
  const conversationMenu = () => setConversationOptionsOpen(true);
  const showTransferOwnership = () => {
    setConversationOptionsOpen(false);
    const members = groupMembers.filter(
      (member) => String(userIdOf(member)) !== String(userIdOf(user)),
    );
    showDialog(
      "Transfer ownership",
      "Choose a group member to become the new owner. You will remain a member.",
      [
        ...members.map((member) => ({
          text: titleOf(member),
          onPress: () => transferGroupOwnership(member),
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  };
  const openGroupInfo = () => {
    setConversationOptionsOpen(false);
    setGroupInfoOpen(true);
  };
  const openAddMembers = async () => {
    setGroupInfoOpen(false);
    setSelectedMemberIds([]);
    setAddMembersOpen(true);
    try {
      const result = await api.get("/chat-service/users", {
        ...requestConfig,
        params: { limit: 100 },
      });
      const data = dataOf(result);
      setAvailableUsers(data.users || data.data || (Array.isArray(data) ? data : []));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to load people.");
      setAvailableUsers([]);
    }
  };
  const addGroupMembers = async () => {
    if (!selectedMemberIds.length || groupActionBusy) return;
    setGroupActionBusy(true);
    try {
      const result = await api.post(
        `/chat-service/conversations/${encodeURIComponent(chatId)}/members`,
        { userIds: selectedMemberIds },
        requestConfig,
      );
      const data = dataOf(result);
      const updated = data.conversation || data;
      if (Array.isArray(updated?.participants)) setGroupMembers(updated.participants);
      else {
        setGroupMembers((current) => [
          ...current,
          ...availableUsers.filter((member) => selectedMemberIds.includes(userIdOf(member))),
        ]);
      }
      setSelectedMemberIds([]);
      setAddMembersOpen(false);
      setGroupInfoOpen(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to add group members.");
    } finally {
      setGroupActionBusy(false);
    }
  };
  const removeGroupMember = (member) => {
    showDialog(
      "Remove group member?",
      `Remove ${titleOf(member)} from ${titleOf(chat)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(
                `/chat-service/conversations/${encodeURIComponent(chatId)}/members/${encodeURIComponent(userIdOf(member))}`,
                requestConfig,
              );
              setGroupMembers((current) => current.filter((item) => String(userIdOf(item)) !== String(userIdOf(member))));
            } catch (requestError) {
              setError(requestError?.response?.data?.message || "Unable to remove group member.");
            }
          },
        },
      ],
    );
  };
  const transferGroupOwnership = (member) => {
    setDialog(null);
    showDialog(
      "Transfer group ownership?",
      `Ownership will be transferred to ${titleOf(member)}. You will remain a member of the group.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(
                `/chat-service/conversations/${encodeURIComponent(chatId)}/transfer-ownership`,
                { userId: userIdOf(member) },
                requestConfig,
              );
              setGroupMembers((current) => current.map((item) => {
                if (String(userIdOf(item)) === String(userIdOf(member))) return { ...item, conversationRole: "owner" };
                if (String(userIdOf(item)) === String(userIdOf(user))) return { ...item, conversationRole: "member" };
                return item;
              }));
              showDialog("Ownership transferred", `${titleOf(member)} is now the group owner.`);
            } catch (requestError) {
              setError(requestError?.response?.data?.message || "Unable to transfer group ownership.");
            }
          },
        },
      ],
    );
  };
  const showGroupInfo = () => {
    setConversationOptionsOpen(false);
    setGroupInfoOpen(true);
  };
  const visibleMessages = (searchTerm.trim()
    ? messages.filter((message) => textOf(message).toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : messages
  ).slice().sort((left, right) => {
    const leftPinned = Boolean(left?.metadata?.pinned || left?.pinned);
    const rightPinned = Boolean(right?.metadata?.pinned || right?.pinned);
    return Number(rightPinned) - Number(leftPinned);
  });
  const sharedFiles = messages.flatMap((message) => attachmentsOf(message).map((attachment) => ({ ...attachment, message })));
  const pickAttachment = async (useCamera = false, useFile = false) => {
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : useFile
          ? await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const body = await (await fetch(asset.uri)).blob();
      await api.post(`/chat-service/conversations/${encodeURIComponent(chatId)}/files`, body, {
        ...requestConfig,
        headers: { ...requestConfig.headers, "Content-Type": body.type || asset.mimeType || "application/octet-stream", "x-file-name": encodeURIComponent(asset.name || "attachment"), "x-file-content-type": body.type || asset.mimeType || "application/octet-stream", "x-file-size": String(asset.size || body.size || 0) },
      });
      loadMessages();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to upload attachment.");
    }
  };
  return (
    <SafeAreaView style={[styles.safe, darkTheme && styles.darkChatSurface]}>
      <StatusBar style={darkTheme ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.chatContainer, darkTheme && styles.darkChatSurface]}
      >
        <View style={[styles.chatHeader, darkTheme && styles.darkChatHeader]}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={34} color={darkTheme ? "#fff" : "#6f2da8"} />
          </Pressable>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>
              {titleOf(chat).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.chatHeaderCopy}>
            <Text style={[styles.chatTitle, darkTheme && styles.darkText]} numberOfLines={1}>
              {titleOf(chat)}
            </Text>
            <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{isGroup ? "Group conversation" : availability === "online" ? "Online" : availability === "away" ? "Away" : availability === "busy" ? "Busy" : "Offline"}</Text>
          </View>
          <View style={styles.callActions}>
            <Pressable disabled={callBusy} onPress={() => startCall("audio")}><MaterialCommunityIcons name="phone-outline" size={23} color={darkTheme ? "#fff" : "#6f2da8"} /></Pressable>
            <Pressable disabled={callBusy} onPress={() => startCall("video")}><MaterialCommunityIcons name="video-outline" size={23} color={darkTheme ? "#fff" : "#6f2da8"} /></Pressable>
            <Pressable onPress={conversationMenu}><MaterialCommunityIcons name="dots-vertical" size={23} color={darkTheme ? "#fff" : "#6f2da8"} /></Pressable>
          </View>
        </View>
        <View style={[styles.messageSearchRow, darkTheme && styles.darkChatHeader]}><View style={[styles.messageSearchBox, darkTheme && styles.darkInput]}><MaterialCommunityIcons name="magnify" size={20} color="#aaa2b3" /><TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search messages" placeholderTextColor={darkTheme ? "#aaa2b3" : undefined} returnKeyType="search" style={[styles.messageSearchInput, darkTheme && styles.darkText]} />{searchTerm ? <Pressable onPress={() => setSearchTerm("")} accessibilityLabel="Clear message search" hitSlop={8}><MaterialCommunityIcons name="close-circle" size={19} color="#aaa2b3" /></Pressable> : null}</View>{searchTerm.trim() ? <Text style={[styles.searchResultText, darkTheme && styles.darkSearchResult]}>{visibleMessages.length} {visibleMessages.length === 1 ? "message" : "messages"} found</Text> : null}</View>
        {!!selectedMessageIds.length && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#f0e8f7" }}><Text style={styles.optionText}>{selectedMessageIds.length} selected</Text><View style={{ flexDirection: "row", gap: 14 }}><Pressable onPress={() => setSelectedMessageIds([])}><Text style={styles.actionText}>Cancel</Text></Pressable><Pressable onPress={deleteSelectedMessages}><Text style={styles.optionDangerText}>Delete</Text></Pressable></View></View>}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#6f2da8" />
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item, index) => `${idOf(item, index)}-${index}`}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => {
              const mine =
                String(
                  item?.sender?.appUserId ||
                    item?.senderId ||
                    item?.authorId ||
                    "",
                ) === String(user?.id || user?.user_id || "");
              return (
                  <Pressable
                  style={[
                    styles.messageBubble,
                    mine ? styles.myMessage : styles.theirMessage,
                    mine && darkTheme && styles.darkMineMessage,
                    !mine && darkTheme && styles.darkMessage,
                    selectedMessageIds.includes(String(messageIdOf(item))) && { borderWidth: 2, borderColor: "#6f2da8" },
                  ]}
                  onLongPress={() => messageAction(item)}
                >
                  {!!item?.metadata?.pinned && <Text style={styles.pinnedLabel}>Pinned</Text>}
                  {!!item?.replyTo && <Text style={mine ? styles.replyMine : styles.replyTheirs}>Replying to a message</Text>}
                  {attachmentsOf(item).map((attachment) => {
                    const isImage = String(attachment.contentType).startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.name);
                    return attachment.url && isImage
                      ? <Image key={attachment.id} source={{ uri: attachment.url }} style={styles.attachmentImage} />
                      : <Pressable key={attachment.id} style={styles.attachmentFile} onPress={() => attachment.url && Share.share({ message: attachment.url })}><MaterialCommunityIcons name="file-outline" size={20} color={mine ? "#fff" : "#6f2da8"} /><Text style={mine ? styles.myMessageText : styles.theirMessageText}>{attachment.name}</Text></Pressable>;
                  })}
                  <Text
                    style={
                      mine ? styles.myMessageText : [styles.theirMessageText, darkTheme && styles.darkTheirMessageText]
                    }
                  >
                    {textOf(item)}
                  </Text>
                  <Text style={mine ? styles.myTime : [styles.theirTime, darkTheme && styles.darkTheirTime]}>
                    {item?.timestamp || item?.createdAt || ""}
                    {mine && <MaterialCommunityIcons name={(["read", "seen"].includes(String(item?.deliveryStatus || item?.delivery_status || "").toLowerCase())) ? "check-all" : "check"} size={14} color={(["read", "seen"].includes(String(item?.deliveryStatus || item?.delivery_status || "").toLowerCase())) ? "#65b8ff" : "#d8e2ea"} />}
                  </Text>
                    {!!item?.reactions?.length && <Text style={mine ? styles.reactionMine : styles.reactionTheirs}>{item.reactions.map((reaction) => reaction.emoji).join(" ")}</Text>}
                  </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.muted, darkTheme && styles.darkMuted]}>
                No messages yet. Start the conversation.
              </Text>
            }
          />
        )}
        {!!typingUser && <View style={styles.typingIndicator}><View style={styles.typingDots}><View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} /></View><Text style={[styles.typingText, darkTheme && styles.darkTypingText]}>{typingUser} is typing...</Text></View>}
        {!!error && <Text style={styles.errorInline}>{error}</Text>}
        {!!(replyTo || editingMessage) && <View style={[styles.replyBar, darkTheme && styles.darkInput]}><Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{editingMessage ? "Editing message" : `Replying to: ${textOf(replyTo) || "Attachment"}`}</Text><Pressable onPress={() => { setReplyTo(null); setEditingMessage(null); setText(""); }}><Text style={styles.actionText}>Cancel</Text></Pressable></View>}
        <View style={[styles.composer, darkTheme && styles.darkComposer]}>
          <Pressable onPress={() => showDialog("Attach", "Choose attachment", [{ text: "Photo", onPress: () => pickAttachment(false) }, { text: "Camera", onPress: () => pickAttachment(true) }, { text: "File", onPress: () => pickAttachment(false, true) }, { text: "Cancel", style: "cancel" }])} style={[styles.attachButton, darkTheme && styles.darkComposerButton]}><MaterialCommunityIcons name="plus" size={25} color={darkTheme ? "#fff" : "#6f2da8"} /></Pressable>
          <TextInput
            multiline
            maxLength={4000}
            blurOnSubmit={enterToSend}
            returnKeyType={enterToSend ? "send" : "default"}
            onSubmitEditing={() => { if (enterToSend) send(); }}
            placeholder="Write a message"
            value={text}
            onChangeText={updateDraftText}
            style={[styles.composerInput, darkTheme && styles.darkComposerInput, darkTheme && styles.darkText]}
          />
          <Pressable onPress={() => { setReactionPickerMessage(null); setEmojiOpen(true); }} style={styles.composerEmojiButton}><MaterialCommunityIcons name="emoticon-outline" size={25} color={darkTheme ? "#fff" : "#6f2da8"} /></Pressable>
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel={sending ? "Sending message" : "Send message"}
            style={[
              styles.sendButton,
              (!text.trim() || sending) && styles.disabled,
            ]}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name={text.trim() ? "send" : "microphone-outline"} size={21} color="#fff" />}
            <Text style={styles.sendButtonText}>{sending ? "ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "Send"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.dialogOverlay}><View style={[styles.dialogCard, darkTheme && styles.darkCard]}><Text style={[styles.dialogTitle, darkTheme && styles.darkDialogTitle]}>{dialog?.title}</Text><Text style={[styles.dialogMessage, darkTheme && styles.darkDialogMessage]}>{dialog?.message}</Text><View style={styles.dialogButtons}>{(dialog?.buttons || []).map((button, index) => <Pressable key={`${button.text}-${index}`} style={[styles.dialogButton, button.style === "destructive" && styles.dialogDangerButton]} onPress={() => { setDialog(null); button.onPress?.(); }}><Text style={[styles.dialogButtonText, darkTheme && styles.darkText, button.style === "destructive" && styles.dialogDangerText]}>{button.text}</Text></Pressable>)}</View></View></View>
      </Modal>
      <Modal visible={Boolean(incomingCall || activeCall)} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            <MaterialCommunityIcons name={incomingCall?.type === "video" || activeCall?.type === "video" ? "video-outline" : "phone-outline"} size={34} color="#6f2da8" />
            <Text style={styles.callTitle}>{incomingCall ? `Incoming ${incomingCall.type === "video" ? "video" : "voice"} call` : `${activeCall?.type === "video" ? "Video" : "Voice"} call`}</Text>
            <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{incomingCall?.startedBy?.name || (activeCall ? "Call connected" : "Someone is calling you")}</Text>
            {incomingCall ? <View style={styles.callButtons}><Pressable style={styles.callDecline} onPress={() => respondToCall(incomingCall, "decline")}><Text style={styles.callButtonText}>Decline</Text></Pressable><Pressable style={styles.callAccept} onPress={() => respondToCall(incomingCall, "accept")}><Text style={styles.callButtonText}>Accept</Text></Pressable></View> : <MobileCallPanel activeCall={activeCall} currentUser={user} socketRef={socketRef} onEnd={endCall} darkTheme={darkTheme} />}
          </View>
        </View>
      </Modal>
      <Modal visible={mediaOpen} animationType="slide" onRequestClose={() => setMediaOpen(false)}>
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}><Text style={[styles.listTitle, darkTheme && styles.darkText]}>Media, links & files</Text><Pressable onPress={() => setMediaOpen(false)}><Text style={[styles.actionText, darkTheme && styles.darkText]}>Close</Text></Pressable></View>
          <FlatList
            data={sharedFiles}
            keyExtractor={(item, index) => `${item.id || item.url || index}`}
            renderItem={({ item }) => <Pressable style={[styles.userRow, darkTheme && styles.darkRow]} onPress={() => item.url && Share.share({ message: item.url })}><MaterialCommunityIcons name={String(item.contentType).startsWith("image/") ? "image-outline" : "file-outline"} size={24} color="#6f2da8" /><View style={styles.conversationCopy}><Text style={[styles.conversationTitle, darkTheme && styles.darkText]}>{item.name}</Text><Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{item.contentType || "File"}</Text></View></Pressable>}
            ListEmptyComponent={<Text style={styles.emptyText}>No files shared in this conversation.</Text>}
          />
        </SafeAreaView>
      </Modal>
      <Modal visible={conversationOptionsOpen} transparent animationType="fade" onRequestClose={() => setConversationOptionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConversationOptionsOpen(false)}>
          <View style={[styles.optionsSheet, darkTheme && styles.darkCard]} onStartShouldSetResponder={() => true}>
            <Text style={styles.listTitle}>Conversation options</Text>
            <Pressable style={styles.optionRow} onPress={() => { setConversationOptionsOpen(false); setMediaOpen(true); }}><MaterialCommunityIcons name="paperclip" size={21} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkOptionText]}>Media, links & files</Text></Pressable>
            {isGroup && <Pressable style={styles.optionRow} onPress={() => { setConversationOptionsOpen(false); showGroupInfo(); }}><MaterialCommunityIcons name="account-group-outline" size={21} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkOptionText]}>Group info</Text></Pressable>}
            {isGroupConversation && canTransferGroupOwnership && <Pressable style={styles.optionRow} onPress={showTransferOwnership}><MaterialCommunityIcons name="swap-horizontal" size={21} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkOptionText]}>Transfer ownership</Text></Pressable>}
            <Pressable style={styles.optionRow} onPress={toggleMute}><MaterialCommunityIcons name={muted ? "bell-outline" : "bell-off-outline"} size={21} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkOptionText]}>{muted ? "Unmute notifications" : "Mute notifications"}</Text></Pressable>
            {!isGroup && <Pressable style={styles.optionRow} onPress={toggleBlock}><MaterialCommunityIcons name="account-cancel-outline" size={21} color="#c62828" /><Text style={styles.optionDangerText}>{blocked ? "Unblock user" : "Block user"}</Text></Pressable>}
            <Pressable style={styles.optionRow} onPress={clearHistory}><MaterialCommunityIcons name="delete-sweep-outline" size={21} color="#c62828" /><Text style={styles.optionDangerText}>Clear chat</Text></Pressable>
            {isGroup && <Pressable style={styles.optionRow} onPress={leaveConversation}><MaterialCommunityIcons name="exit-to-app" size={21} color="#c62828" /><Text style={styles.optionDangerText}>Exit group</Text></Pressable>}
            {!isGroup && <Pressable style={styles.optionRow} onPress={leaveConversation}><MaterialCommunityIcons name="exit-to-app" size={21} color="#c62828" /><Text style={styles.optionDangerText}>Leave conversation</Text></Pressable>}
            <Pressable style={styles.optionCancel} onPress={() => setConversationOptionsOpen(false)}><Text style={[styles.actionText, darkTheme && styles.darkText]}>Cancel</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={groupInfoOpen} animationType="slide" onRequestClose={() => setGroupInfoOpen(false)}>
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
            <View>
              <Text style={[styles.listTitle, darkTheme && styles.darkText]}>Group info</Text>
              <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{groupMembers.length} members</Text>
            </View>
            <Pressable onPress={() => setGroupInfoOpen(false)}><Text style={styles.actionText}>Close</Text></Pressable>
          </View>
          <FlatList
            data={groupMembers}
            keyExtractor={(item, index) => userIdOf(item) || String(index)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isCurrentMember = String(userIdOf(item)) === String(userIdOf(user));
              const role = item.conversationRole || item.role;
              return (
                <View style={[styles.userRow, darkTheme && styles.darkRow]}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{titleOf(item).charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.conversationCopy}>
                    <Text style={[styles.conversationTitle, darkTheme && styles.darkText]}>{isCurrentMember ? "You" : titleOf(item)}</Text>
                    <Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{role ? String(role) : "Member"}</Text>
                  </View>
                  {canTransferGroupOwnership && !isCurrentMember && <Pressable onPress={() => removeGroupMember(item)} hitSlop={8}><MaterialCommunityIcons name="account-remove-outline" size={22} color="#c62828" /></Pressable>}
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No group members found.</Text>}
          />
          {canTransferGroupOwnership && <Pressable style={styles.primaryButton} onPress={openAddMembers}><Text style={styles.primaryButtonText}>Add people</Text></Pressable>}
        </SafeAreaView>
      </Modal>
      <Modal visible={addMembersOpen} animationType="slide" onRequestClose={() => setAddMembersOpen(false)}>
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}>
            <Text style={[styles.listTitle, darkTheme && styles.darkText]}>Add people</Text>
            <Pressable onPress={() => setAddMembersOpen(false)}><Text style={styles.actionText}>Close</Text></Pressable>
          </View>
          <FlatList
            data={availableUsers.filter((item) => !groupMembers.some((member) => String(userIdOf(member)) === String(userIdOf(item))) && String(userIdOf(item)) !== String(userIdOf(user)))}
            keyExtractor={(item, index) => userIdOf(item) || String(index)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selectedMember = selectedMemberIds.includes(userIdOf(item));
              return <Pressable style={[styles.userRow, darkTheme && styles.darkRow]} onPress={() => setSelectedMemberIds((current) => selectedMember ? current.filter((id) => id !== userIdOf(item)) : [...current, userIdOf(item)])}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{titleOf(item).charAt(0).toUpperCase()}</Text></View>
                <View style={styles.conversationCopy}><Text style={[styles.conversationTitle, darkTheme && styles.darkText]}>{titleOf(item)}</Text><Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>{item.email || item.username || "Chat user"}</Text></View>
                <MaterialCommunityIcons name={selectedMember ? "checkbox-marked" : "checkbox-blank-outline"} size={23} color={selectedMember ? "#6f2da8" : "#888294"} />
              </Pressable>;
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No people available to add.</Text>}
          />
          <Pressable style={[styles.primaryButton, (!selectedMemberIds.length || groupActionBusy) && styles.disabled]} disabled={!selectedMemberIds.length || groupActionBusy} onPress={addGroupMembers}>
            <Text style={styles.primaryButtonText}>{groupActionBusy ? "Adding..." : `Add selected (${selectedMemberIds.length})`}</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
      <Modal visible={Boolean(actionMessage)} transparent animationType="slide" onRequestClose={() => setActionMessage(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionMessage(null)}>
          <View style={[styles.actionSheet, darkTheme && styles.darkCard]} onStartShouldSetResponder={() => true}>
            <View style={styles.actionSheetHandle} />
            <Text style={[styles.actionSheetTitle, darkTheme && styles.darkText]}>Message actions</Text>
            <View style={styles.reactionStrip}>
              {REACTION_OPTIONS.map((emoji) => <Pressable key={emoji} style={styles.reactionButton} onPress={() => reactToMessage(actionMessage, emoji)}><Text style={styles.reactionEmoji}>{emoji}</Text></Pressable>)}
              <Pressable style={styles.reactionButton} onPress={() => { setActionMessage(null); setReactionPickerMessage(actionMessage); setEmojiOpen(true); }}><MaterialCommunityIcons name="emoticon-plus-outline" size={22} color="#6f2da8" /></Pressable>
            </View>
            <Pressable style={styles.actionSheetRow} onPress={() => { setActionMessage(null); openMessageInfo(actionMessage); }}><MaterialCommunityIcons name="information-outline" size={22} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkText]}>Message info</Text></Pressable>
            <Pressable style={styles.actionSheetRow} onPress={() => { setActionMessage(null); setReplyTo(actionMessage); }}><MaterialCommunityIcons name="reply-outline" size={22} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkText]}>Reply</Text></Pressable>
            <Pressable style={styles.actionSheetRow} onPress={() => toggleMessagePin(actionMessage)}><MaterialCommunityIcons name="pin-outline" size={22} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkText]}>{actionMessage?.metadata?.pinned ? "Unpin message" : "Pin message"}</Text></Pressable>
            <Pressable style={styles.actionSheetRow} onPress={() => { setActionMessage(null); setForwardMessage(actionMessage); }}><MaterialCommunityIcons name="share-outline" size={22} color="#6f2da8" /><Text style={[styles.optionText, darkTheme && styles.darkText]}>Forward</Text></Pressable>
            {String(userIdOf(actionMessage?.sender || actionMessage)) === String(userIdOf(user)) && <Pressable style={styles.actionSheetRow} onPress={() => { setActionMessage(null); setEditingMessage(actionMessage); setText(textOf(actionMessage)); }}><MaterialCommunityIcons name="pencil-outline" size={22} color="#6f2da8" /><Text style={styles.optionText}>Edit</Text></Pressable>}
            <Pressable style={styles.optionCancel} onPress={() => setActionMessage(null)}><Text style={styles.actionText}>Cancel</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(infoMessage)} transparent animationType="fade" onRequestClose={() => setInfoMessage(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoMessage(null)}>
          <View style={[styles.infoCard, darkTheme && styles.darkCard]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.listTitle, darkTheme && styles.darkText]}>Message info</Text>
            <Text style={styles.infoLabel}>Sent</Text><Text style={[styles.infoValue, darkTheme && styles.darkText]}>{infoMessage?.createdAt || infoMessage?.timestamp || "Unknown"}</Text>
            <Text style={styles.infoLabel}>Read by</Text><Text style={[styles.infoValue, darkTheme && styles.darkText]}>{infoLoading ? "Loading…" : (infoMessage?.readBy?.length || infoMessage?.read_by?.length || 0)}</Text>
            <Text style={styles.infoLabel}>Delivered to</Text><Text style={[styles.infoValue, darkTheme && styles.darkText]}>{infoLoading ? "Loading…" : (infoMessage?.deliveredTo?.length || infoMessage?.delivered_to?.length || 0)}</Text>
            <Pressable style={styles.optionCancel} onPress={() => setInfoMessage(null)}><Text style={styles.actionText}>Close</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={emojiOpen} transparent animationType="fade" onRequestClose={() => setEmojiOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEmojiOpen(false)}>
          <View style={[styles.optionsSheet, darkTheme && styles.darkCard, { flexDirection: "row", flexWrap: "wrap", gap: 8 }]} onStartShouldSetResponder={() => true}>
            {REACTION_OPTIONS.concat(["😀", "😎", "🔥", "🎉", "✅", "💯", "🚀", "💡", "👏", "🙌"]).map((emoji) => <Pressable key={emoji} onPress={() => addEmoji(emoji)} style={{ padding: 8 }}><Text style={{ fontSize: 28 }}>{emoji}</Text></Pressable>)}
            <Pressable style={styles.optionCancel} onPress={() => setEmojiOpen(false)}><Text style={styles.actionText}>Cancel</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(forwardMessage)} animationType="slide" onRequestClose={() => setForwardMessage(null)}>
        <SafeAreaView style={[styles.safe, darkTheme && styles.safeDark]}>
          <View style={[styles.modalHeader, darkTheme && styles.darkSurface]}><Text style={[styles.listTitle, darkTheme && styles.darkText]}>Forward to</Text><Pressable onPress={() => setForwardMessage(null)}><Text style={[styles.actionText, darkTheme && styles.darkText]}>Close</Text></Pressable></View>
          <FlatList
            data={conversations.filter((item) => String(chatIdOf(item)) !== String(chatId))}
            keyExtractor={(item, index) => `${chatIdOf(item)}-${index}`}
            renderItem={({ item }) => <Pressable style={[styles.userRow, darkTheme && styles.darkRow]} onPress={() => forwardToConversation(item)}><MaterialCommunityIcons name="send-outline" size={22} color="#6f2da8" /><View style={styles.conversationCopy}><Text style={[styles.conversationTitle, darkTheme && styles.darkText]}>{titleOf(item)}</Text><Text style={[styles.mutedSmall, darkTheme && styles.darkMuted]}>Conversation</Text></View></Pressable>}
            ListEmptyComponent={<Text style={styles.emptyText}>No other conversations available.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export { ChatScreen };
