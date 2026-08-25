import { useCallback, useEffect, useRef, useState } from "react";
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
import DownloadIcon from "@mui/icons-material/Download";
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
import {
  getChatSettingsService,
  searchChatMessagesService,
  updateChatSettingsService,
} from "../Services/chat.services";
import ChatSidebarSettingsDialog from "./sidebar/ChatSidebarSettingsDialog";
import { getCurrentUserName } from "./sidebar/sidebarUtils";
import SidebarHeader from "./sidebar/SidebarHeader";
import ConversationList from "./sidebar/ConversationList";
import SearchBox from "./sidebar/SearchBox";
import SidebarRail from "./sidebar/SidebarRail";
import NotesDialog from "./sidebar/NotesDialog";

const getNotesStorageKey = (userId) => `pingly_notes_${userId || "guest"}`;

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
  settingsPage = false,
  onSettingsClose,
  onSettingsOpen,
  onClearSelectedChat,
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
  const [expandedMediaId, setExpandedMediaId] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const avatarInputRef = useRef(null);
  const currentUserName = getCurrentUserName(currentUser);
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || "",
  );
  const notesStorageKey = getNotesStorageKey(currentUserId);

  useEffect(() => {
    if (!currentUserId) return;

    getChatSettingsService()
      .then((response) => {
        const settings = response?.data?.data || response?.data || {};
        if (typeof settings.desktopNotifications !== "boolean") return;
        setNotificationsEnabled(settings.desktopNotifications);
        setChatNotificationsEnabled(settings.desktopNotifications);
      })
      .catch(() => {
        // Keep the local preference if the settings endpoint is unavailable.
      });
  }, [currentUserId]);

  const persistNotificationSetting = async (enabled) => {
    setChatNotificationsEnabled(enabled);
    setNotificationsEnabled(enabled);
    try {
      await updateChatSettingsService({ desktopNotifications: enabled });
    } catch {
      setSettingsNotice("Notification setting could not be saved to the server.");
    }
  };

  useEffect(() => {
    try {
      const savedNotes = JSON.parse(localStorage.getItem(notesStorageKey) || "[]");
      setNotes(Array.isArray(savedNotes) ? savedNotes : []);
    } catch {
      setNotes([]);
    }
  }, [notesStorageKey]);

  const saveNotes = useCallback((nextNotes) => {
    setNotes(nextNotes);
    localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
  }, [notesStorageKey]);

  const handleSaveNote = async ({ id, title, body, reminderAt }) => {
    if (reminderAt && (notificationPermission !== "granted" || !notificationsEnabled)) {
      const permission = await requestChatNotificationPermission();
      setNotificationPermission(permission);
      await persistNotificationSetting(permission === "granted");
    }

    const now = new Date().toISOString();
    const existingNote = notes.find((noteItem) => noteItem.id === id);
    const normalizedReminderAt = reminderAt ? new Date(reminderAt).toISOString() : "";
    const note = {
      id: id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      title: title.trim(),
      body: body.trim(),
      reminderAt: normalizedReminderAt,
      notifiedAt: existingNote?.reminderAt === normalizedReminderAt ? existingNote?.notifiedAt || "" : "",
      updatedAt: now,
    };
    const nextNotes = id
      ? notes.map((existingNote) => existingNote.id === id ? { ...existingNote, ...note } : existingNote)
      : [{ ...note, createdAt: now }, ...notes];
    saveNotes(nextNotes);
  };

  const handleDeleteNote = (id) => {
    saveNotes(notes.filter((note) => note.id !== id));
  };

  useEffect(() => {
    const sendDueReminders = () => {
      if (!notificationsEnabled || notificationPermission !== "granted") return;
      const now = Date.now();
      const dueNoteIds = notes
        .filter((note) => note.reminderAt && !note.notifiedAt && new Date(note.reminderAt).getTime() <= now)
        .map((note) => note.id);
      if (dueNoteIds.length === 0) return;

      const dueNotes = notes.filter((note) => dueNoteIds.includes(note.id));
      dueNotes.forEach((note) => {
        showChatNotification({
          title: note.title || "Pingly reminder",
          body: note.body || "Your note reminder is due.",
          icon: getImageUrl(currentUser),
          tag: `pingly-note-${note.id}`,
        });
      });
      const nextNotes = notes.map((note) => dueNoteIds.includes(note.id)
        ? { ...note, notifiedAt: new Date().toISOString() }
        : note);
      saveNotes(nextNotes);
    };

    sendDueReminders();
    const intervalId = window.setInterval(sendDueReminders, 30_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser, notificationPermission, notificationsEnabled, notes, saveNotes]);

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
      await persistNotificationSetting(false);
      setSettingsNotice("Desktop notifications are off.");
      return;
    }

    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    await persistNotificationSetting(permission === "granted");
    setSettingsNotice(
      permission === "granted"
        ? "Desktop notifications are on."
        : "Browser notification permission was not granted.",
    );
  };

  const handleTestNotification = async () => {
    const permission = await requestChatNotificationPermission();
    setNotificationPermission(permission);
    await persistNotificationSetting(permission === "granted");

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

  const runRailAction = (action) => {
    if (!settingsPage) {
      action();
      return;
    }

    onSettingsClose?.();
    window.setTimeout(action, 0);
  };

  return (
    <Box
      className={`chat-sidebar-shell ${selectedChat ? "d-none d-md-grid" : "d-grid"}`}
      sx={{
        gridTemplateColumns: { xs: "58px minmax(0, 1fr)", md: "76px 304px" },
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        bgcolor: "var(--chat-canvas)",
        position: "relative",
        zIndex: 2,
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          right: -1,
          bottom: 0,
          width: 2,
          bgcolor: "#2b3142",
          pointerEvents: "none",
          display: { xs: "none", md: "block" },
        },
      }}
    >
      <SidebarRail
        avatarUploading={avatarUploading}
        currentUser={currentUser}
        currentUserName={currentUserName}
        onOpenCalls={() => runRailAction(() => {
          onClearSelectedChat?.();
          openLibrary({ tab: "calls" });
        })}
        onOpenMedia={() => runRailAction(() => {
          onClearSelectedChat?.();
          openLibrary({ tab: "media" });
        })}
        onOpenNotes={() => runRailAction(() => {
          onClearSelectedChat?.();
          setNotesOpen(true);
        })}
        onCreateGroup={() => runRailAction(() => {
          onClearSelectedChat?.();
          onCreateGroup?.();
        })}
        onSettingsOpen={onSettingsOpen || (() => setSettingsOpen(true))}
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

      <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, bgcolor: "var(--chat-canvas)" }}>
        <SidebarHeader
        />
        <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <ConversationList
          connectUrl={connectUrl}
          filteredItems={filteredItems}
          loadError={loadError}
          loading={loading}
          onRefresh={onRefresh}
          onCreateGroup={onCreateGroup}
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
        onClose={settingsPage ? onSettingsClose : () => setSettingsOpen(false)}
        onStatusPick={onStatusChange}
        onTestNotification={handleTestNotification}
        onToggleNotifications={handleToggleNotifications}
        onEnterToSendChange={onEnterToSendChange}
        onLogout={onLogout}
        open={settingsOpen || settingsPage}
        page={settingsPage}
        settingsNotice={settingsNotice}
        statusSaving={statusSaving}
      />
      <NotesDialog
        notes={notes}
        open={notesOpen}
        page
        onClose={() => setNotesOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
      <Dialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        hideBackdrop
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            position: "fixed",
            top: 0,
            bottom: 0,
            left: { xs: 0, sm: 320, md: 380 },
            width: { xs: "100vw", sm: "calc(100vw - 320px)", md: "calc(100vw - 380px)" },
            maxWidth: "none",
            maxHeight: "none",
            height: "100vh",
            m: 0,
            borderRadius: 0,
            bgcolor: "var(--chat-canvas)",
            border: 0,
            boxShadow: "none",
          },
        }}
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
            <List disablePadding sx={{ p: { xs: 1.25, sm: 2 }, display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
              {mediaItems.map((item) => {
                const meta = [item.contentType, formatFileSize(item.size)]
                  .filter(Boolean)
                  .join(" - ");
                const contentType = String(item.contentType || "").toLowerCase();
                const isImage = contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(item.name || "");
                const isPdf = contentType === "application/pdf" || /\.pdf$/i.test(item.name || "");
                const mediaId = `${item.message.id}-${item.id}`;
                const expanded = expandedMediaId === mediaId;

                return (
                  <Box
                    key={mediaId}
                    onClick={() => setExpandedMediaId(expanded ? null : mediaId)}
                    sx={{
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: expanded ? "primary.main" : "divider",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      cursor: "pointer",
                      gridColumn: expanded ? { xs: "span 2", sm: "span 3", lg: "span 5" } : "span 1",
                      transition: "border-color 160ms ease, transform 160ms ease",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
                    }}
                  >
                    <Box sx={{ position: "relative", width: "100%", aspectRatio: expanded ? "16 / 7" : "1 / 1", bgcolor: "action.hover" }}>
                      {isImage && item.url ? (
                        <Box
                          component="img"
                          src={item.url}
                          alt={item.name || "Shared image"}
                          loading="lazy"
                          sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : isPdf && item.url ? (
                        <Box
                          component="iframe"
                          src={`${item.url}#toolbar=0&navpanes=0&scrollbar=0`}
                          title={item.name || "PDF preview"}
                          sx={{ display: "block", width: "100%", height: "100%", border: 0, pointerEvents: "none", bgcolor: "#ffffff" }}
                        />
                      ) : (
                        <Box sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "primary.main" }}>
                          <AttachFileIcon sx={{ fontSize: expanded ? 52 : 30 }} />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, p: 0.75 }}>
                      <Box minWidth={0} flex={1}>
                        <Typography fontSize={12} fontWeight={750} noWrap title={item.name}>
                          {item.name || "Attachment"}
                        </Typography>
                        {expanded && (
                          <Typography fontSize={10.5} color="text.secondary" noWrap>
                            {`${meta || "Attachment"} - ${new Date(item.message.sentAt).toLocaleString()}`}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        disabled={!item.url}
                        component="a"
                        href={item.url || undefined}
                        download={item.name || true}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Download ${item.name || "attachment"}`}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
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
