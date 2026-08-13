import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
  showChatNotification,
} from "./chatNotifications";
import {
  getImageUrl,
  getMessageAttachments,
  normalizeChatMessages,
} from "./chatHelpers";
import { searchChatMessagesService } from "../Services/chat.services";
import ChatSidebarSettingsDialog from "./sidebar/ChatSidebarSettingsDialog";
import { getCurrentUserName } from "./sidebar/sidebarUtils";
import SidebarHeader from "./sidebar/SidebarHeader";
import ConversationList from "./sidebar/ConversationList";
import SearchBox from "./sidebar/SearchBox";
import SidebarRail from "./sidebar/SidebarRail";

export default function ChatSidebar({
  avatarUploading = false,
  currentUser,
  filteredItems,
  loadError,
  loading,
  currentStatus,
  enterToSend = false,
  onEnterToSendChange,
  onLogout,
  onAvatarUpload,
  onCreateGroup,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  onStartCallFromHistory,
  onStatusChange,
  searchTerm,
  selectedChat,
  statusSaving,
  callStarting = false,
  totalUnreadCount = 0,
  connectUrl,
  setSearchTerm,
  setTab,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    areChatNotificationsEnabled(),
  );
  const [notificationPermission, setNotificationPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const [settingsNotice, setSettingsNotice] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState("calls");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryMessages, setLibraryMessages] = useState([]);
  const avatarInputRef = useRef(null);
  const currentUserName = getCurrentUserName(currentUser);
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || "",
  );

  const callMessages = libraryMessages.filter(
    (message) => message.metadata?.kind === "call_history",
  );
  const mediaItems = libraryMessages.flatMap((message) =>
    getMessageAttachments(message).map((attachment) => ({
      ...attachment,
      message,
    })),
  );

  const formatFileSize = (bytes) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isUnansweredCall = (message) =>
    ["missed", "cancelled", "failed"].includes(
      String(message.metadata?.callHistory?.status || "").toLowerCase(),
    );

  const callFromHistory = (message, type = "audio") => {
    const chatId = message.chatId || message.chat_id;
    if (!chatId || callStarting) return;

    onStartCallFromHistory?.({
      chatId,
      type,
    });
    setLibraryOpen(false);
  };

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onAvatarUpload?.(file);
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      setChatNotificationsEnabled(false);
      setNotificationsEnabled(false);
      setSettingsNotice("Desktop notifications are off.");
      return;
    }

    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    setNotificationsEnabled(permission === "granted");
    setSettingsNotice(
      permission === "granted"
        ? "Desktop notifications are on."
        : "Browser notification permission was not granted.",
    );
  };

  const handleTestNotification = async () => {
    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    setNotificationsEnabled(permission === "granted");

    if (permission === "granted") {
      showChatNotification({
        title: "Pingly",
        body: "Desktop notifications are ready. New messages will appear here.",
        icon: getImageUrl(currentUser),
        tag: `pingly-test-notification-${Date.now()}`,
      });
      setSettingsNotice("Test notification sent.");
    } else if (permission === "denied") {
      setSettingsNotice("Notifications are blocked in this browser.");
    } else if (permission === "unsupported") {
      setSettingsNotice("This browser does not support desktop notifications.");
    } else {
      setSettingsNotice("Notification permission was not granted.");
    }
  };

  const openLibrary = async ({ force = false, tab = libraryTab } = {}) => {
    setLibraryTab(tab);
    setLibraryOpen(true);
    setLibraryError("");

    if ((!force && libraryMessages.length > 0) || libraryLoading) return;

    setLibraryLoading(true);
    try {
      const response = await searchChatMessagesService({
        type: "calls_media",
        limit: 100,
      });
      const messages =
        response.data?.data?.messages ||
        response.data?.data?.data ||
        response.data?.data ||
        [];
      setLibraryMessages(
        normalizeChatMessages(messages, { currentUserId }).sort(
          (first, second) => new Date(second.sentAt) - new Date(first.sentAt),
        ),
      );
    } catch (error) {
      setLibraryError(
        error?.response?.data?.message ||
          error.message ||
          "Unable to load calls and media.",
      );
    } finally {
      setLibraryLoading(false);
    }
  };

  return (
    <Box
      className={selectedChat ? "d-none d-md-grid" : "d-grid"}
      sx={{
        gridTemplateColumns: { xs: "56px minmax(0, 1fr)", md: "68px minmax(0, 1fr)" },
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        bgcolor: "background.paper",
        borderRight: { md: "1px solid", borderColor: "divider" },
      }}
    >
      <SidebarRail
        avatarUploading={avatarUploading}
        currentUser={currentUser}
        currentUserName={currentUserName}
        onOpenCalls={() => openLibrary({ tab: "calls" })}
        onOpenMedia={() => openLibrary({ tab: "media" })}
        onSettingsOpen={() => setSettingsOpen(true)}
        onTabSelect={setTab}
        totalUnreadCount={totalUnreadCount}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        onChange={handleAvatarChange}
      />

      <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SidebarHeader
          onCreateGroup={onCreateGroup}
        />
        <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ConversationList
          connectUrl={connectUrl}
          filteredItems={filteredItems}
          loadError={loadError}
          loading={loading}
          onRefresh={onRefresh}
          onSelectBuddy={onSelectBuddy}
          onSelectChannel={onSelectChannel}
          selectedChat={selectedChat}
        />
      </Box>

      <ChatSidebarSettingsDialog
        avatarUploading={avatarUploading}
        currentStatus={currentStatus}
        currentUser={currentUser}
        currentUserName={currentUserName}
        notificationPermission={notificationPermission}
        enterToSend={enterToSend}
        notificationsEnabled={notificationsEnabled}
        onAvatarPick={handleAvatarPick}
        onClose={() => setSettingsOpen(false)}
        onStatusPick={onStatusChange}
        onTestNotification={handleTestNotification}
        onToggleNotifications={handleToggleNotifications}
        onEnterToSendChange={onEnterToSendChange}
        onLogout={onLogout}
        open={settingsOpen}
        settingsNotice={settingsNotice}
        statusSaving={statusSaving}
      />
      <Dialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {libraryTab === "calls" ? "Calls" : "Media"}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, minHeight: 360 }}>
          {libraryLoading && (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={260}>
              <CircularProgress size={24} />
            </Box>
          )}
          {!libraryLoading && libraryError && (
            <Alert severity="error" sx={{ m: 2 }}>
              {libraryError}
            </Alert>
          )}
          {!libraryLoading && !libraryError && libraryTab === "calls" && (
            <List dense disablePadding>
              {callMessages.map((message) => {
                const unanswered = isUnansweredCall(message);

                return (
                  <ListItemButton key={message.id} divider>
                    <ListItemIcon sx={{ minWidth: 38 }}>
                      {message.metadata?.callHistory?.type === "video" ? (
                        <VideocamIcon color={unanswered ? "error" : "primary"} />
                      ) : (
                        <CallIcon color={unanswered ? "error" : "primary"} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={message.text}
                      secondary={`${message.authorName} - ${new Date(message.sentAt).toLocaleString()}`}
                      primaryTypographyProps={{
                        color: unanswered ? "error" : "text.primary",
                        fontSize: 13.5,
                        fontWeight: 700,
                      }}
                      secondaryTypographyProps={{
                        color: unanswered ? "error" : "text.secondary",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip title="Voice call">
                      <span>
                        <IconButton
                          size="small"
                          disabled={callStarting}
                          onClick={(event) => {
                            event.stopPropagation();
                            callFromHistory(message, "audio");
                          }}
                          sx={{ ml: 1 }}
                        >
                          <CallIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Video call">
                      <span>
                        <IconButton
                          size="small"
                          edge="end"
                          disabled={callStarting}
                          onClick={(event) => {
                            event.stopPropagation();
                            callFromHistory(message, "video");
                          }}
                          sx={{ ml: 0.5 }}
                        >
                          <VideocamIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </ListItemButton>
                );
              })}
              {callMessages.length === 0 && (
                <Typography color="text.secondary" fontSize={13} sx={{ p: 2 }}>
                  No call history yet.
                </Typography>
              )}
            </List>
          )}
          {!libraryLoading && !libraryError && libraryTab === "media" && (
            <List dense disablePadding>
              {mediaItems.map((item) => {
                const meta = [item.contentType, formatFileSize(item.size)]
                  .filter(Boolean)
                  .join(" - ");

                return (
                  <Box key={`${item.message.id}-${item.id}`}>
                    <ListItemButton
                      component={item.url ? "a" : "div"}
                      href={item.url || undefined}
                      target={item.url ? "_blank" : undefined}
                      rel={item.url ? "noreferrer" : undefined}
                    >
                      <ListItemIcon sx={{ minWidth: 38 }}>
                        <AttachFileIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={`${meta || "Attachment"} - ${new Date(item.message.sentAt).toLocaleString()}`}
                        primaryTypographyProps={{ fontSize: 13.5, fontWeight: 700, noWrap: true }}
                        secondaryTypographyProps={{ fontSize: 12, noWrap: true }}
                      />
                    </ListItemButton>
                    <Divider />
                  </Box>
                );
              })}
              {mediaItems.length === 0 && (
                <Typography color="text.secondary" fontSize={13} sx={{ p: 2 }}>
                  No shared media or files yet.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLibraryMessages([]);
              openLibrary({ force: true, tab: libraryTab });
            }}
            disabled={libraryLoading}
          >
            Refresh
          </Button>
          <Button onClick={() => setLibraryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
