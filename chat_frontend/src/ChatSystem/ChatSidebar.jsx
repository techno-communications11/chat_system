import { useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Skeleton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import CircleIcon from "@mui/icons-material/Circle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DoneIcon from "@mui/icons-material/Done";
import GroupsIcon from "@mui/icons-material/Groups";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import PinglyMark from "./PinglyMark";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
  showChatNotification,
} from "./chatNotifications";
import {
  getAvailability,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getMessageText,
  getUnreadCount,
} from "./chatHelpers";

const appRailItems = [
  { key: "conversations", label: "All conversations", icon: <ChatBubbleIcon /> },
];

const statusOptions = [
  { value: "online", label: "Online", color: "#22c55e" },
  { value: "away", label: "Away", color: "#f59e0b" },
  { value: "busy", label: "Busy", color: "#ef4444" },
  { value: "offline", label: "Offline", color: "#9aa3af" },
];

const getInitial = (value) => String(value || "Z").trim().charAt(0).toUpperCase();

const isDirectConversation = (item, isChannel) =>
  !isChannel ||
  item?.isDirect ||
  item?.type === "direct" ||
  item?.conversationType === "direct";

const getParticipantCount = (item) => {
  const participants = Array.isArray(item?.participants) ? item.participants : [];
  const count = item?.participantCount || item?.participant_count || participants.length;
  return Number(count) || 0;
};

const getLastMessagePreview = (item, isChannel) => {
  const rawLastMessage =
    item?.lastMessage ||
    item?.last_message ||
    item?.latestMessage ||
    item?.latest_message ||
    null;
  const text = getMessageText(rawLastMessage) || item?.lastMessageText || item?.last_message_text;

  if (text) return text;
  if (isChannel && !isDirectConversation(item, isChannel)) {
    const count = getParticipantCount(item);
    return count ? `${count} members` : "Group chat";
  }

  const availability = getAvailability(item);
  return availability?.label || getBuddyEmail(item) || "Direct message";
};

const getDeliveryState = (item) =>
  String(
    item?.deliveryState ||
      item?.delivery_state ||
      item?.messageStatus ||
      item?.message_status ||
      item?.lastMessage?.status ||
      item?.last_message?.status ||
      "",
  ).toLowerCase();

function PresenceAvatar({ item, title, isChannel }) {
  const availability = getAvailability(item);
  const isDirect = isDirectConversation(item, isChannel);

  if (!isDirect) {
    return (
      <Avatar
        src={getImageUrl(item)}
        sx={{
          width: 42,
          height: 42,
          bgcolor: "#f0e8f7",
          color: "#6F2DA8",
          fontWeight: 800,
        }}
      >
        <GroupsIcon />
      </Avatar>
    );
  }

  return (
    <Tooltip title={availability.label}>
      <Badge
        overlap="circular"
        variant="dot"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{
          "& .MuiBadge-badge": {
            width: 11,
            height: 11,
            borderRadius: "50%",
            bgcolor: availability.color,
            border: "2px solid #ffffff",
          },
        }}
      >
        <Avatar
          src={getImageUrl(item)}
          sx={{
            width: 42,
            height: 42,
            bgcolor: "#e7f0ff",
            color: "#215db0",
            fontWeight: 800,
          }}
        >
          {getInitial(title)}
        </Avatar>
      </Badge>
    </Tooltip>
  );
}

function ChatListItem({
  item,
  isChannel,
  selectedChat,
  onSelectBuddy,
  onSelectChannel,
}) {
  const title = isChannel ? getChannelName(item) : getBuddyName(item);
  const itemId = isChannel ? getChannelId(item) : getBuddySendId(item);
  const selected = String(selectedChat?.id || "") === String(itemId || "");
  const disabled = !itemId;
  const unreadCount = getUnreadCount(item);
  const isDirect = isDirectConversation(item, isChannel);
  const deliveryState = getDeliveryState(item);
  const preview = getLastMessagePreview(item, isChannel);

  return (
    <Box
      key={itemId || title}
      onClick={() => {
        if (disabled) return;
        if (isChannel) {
          onSelectChannel(item);
        } else {
          onSelectBuddy(item);
        }
      }}
      sx={{
        mb: 0.25,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 1,
        bgcolor: selected ? "#f2e9f8" : "transparent",
        opacity: disabled ? 0.58 : 1,
        transition: "background-color 120ms ease, border-color 120ms ease",
        borderLeft: selected ? "3px solid #6F2DA8" : "3px solid transparent",
        "&:hover": {
          bgcolor: disabled ? "transparent" : selected ? "#f2e9f8" : "#f7f8fa",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1,
          py: 0.9,
          minWidth: 0,
        }}
      >
        <PresenceAvatar item={item} title={title} isChannel={isChannel} />
        <Box minWidth={0} flex={1}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Typography
              fontWeight={unreadCount > 0 ? 800 : 700}
              noWrap
              flex={1}
              fontSize={15}
            >
              {title}
            </Typography>
            <Typography variant="caption" color="text.disabled" flexShrink={0}>
              {item?.lastMessageTime || item?.last_message_time || ""}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.75} minWidth={0} mt={0.25}>
            {deliveryState === "read" ? (
              <DoneAllIcon sx={{ fontSize: 15, color: "#3b82f6", flexShrink: 0 }} />
            ) : deliveryState === "sent" ? (
              <DoneIcon sx={{ fontSize: 15, color: "#94a3b8", flexShrink: 0 }} />
            ) : null}
            <Typography
              variant="body2"
              color={unreadCount > 0 ? "text.primary" : "text.secondary"}
              fontWeight={unreadCount > 0 ? 700 : 400}
              noWrap
              flex={1}
              minWidth={0}
            >
              {preview}
            </Typography>
            {!isDirect && (
              <Box
                component="span"
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: "#edf7ee",
                  color: "#1f7a3d",
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                Group
              </Box>
            )}
            {isDirect && (
              <Box
                component="span"
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: "#eef4ff",
                  color: "#215db0",
                  fontSize: 11,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                1:1
              </Box>
            )}
            {unreadCount > 0 && (
              <Box
                component="span"
                sx={{
                  minWidth: 18,
                  height: 18,
                  px: 0.5,
                  borderRadius: "999px",
                  bgcolor: "#d32f2f",
                  color: "#ffffff",
                  fontSize: 10,
                  lineHeight: "18px",
                  textAlign: "center",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {unreadCount}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function ChatSidebar({
  avatarUploading = false,
  currentUser,
  filteredItems,
  loadError,
  loading,
  currentStatus,
  onAvatarUpload,
  onCreateGroup,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  onStatusChange,
  searchTerm,
  selectedChat,
  statusSaving,
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
  const avatarInputRef = useRef(null);
  const sectionTitle = "ALL CONVERSATIONS";
  const currentUserName =
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.username ||
    currentUser?.email ||
    "Current user";
  const currentUserInitial = getInitial(currentUserName);
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

  const handleStatusPick = (presence) => {
    onStatusChange(presence);
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

  return (
    <Box
      className={selectedChat ? "d-none d-md-grid" : "d-grid"}
      sx={{
        gridTemplateColumns: "60px minmax(0, 1fr)",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        bgcolor: "#ffffff",
        borderRight: { md: "1px solid #dfe3ea" },
      }}
    >
      <Box
        sx={{
          bgcolor: "#ffffff",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 1,
          gap: 0.75,
          borderRight: "1px solid #edf0f4",
        }}
      >
        <Tooltip title={currentUserName} placement="right">
          <Avatar
            src={getImageUrl(currentUser)}
            sx={{ width: 38, height: 38, bgcolor: "#6F2DA8", fontWeight: 900 }}
          >
            {avatarUploading ? (
              <CircularProgress size={16} sx={{ color: "#ffffff" }} />
            ) : (
              currentUserInitial
            )}
          </Avatar>
        </Tooltip>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          onChange={handleAvatarChange}
        />
        <Divider flexItem sx={{ borderColor: "#edf0f4", my: 0.5 }} />
        {appRailItems.map((item) => (
          <Tooltip key={item.key} title={item.label} placement="right">
            <IconButton
              onClick={() => setTab(item.key)}
              sx={{
                width: 40,
                height: 40,
                color: "#6F2DA8",
                bgcolor: "#f2e9f8",
                borderRadius: 1.5,
                "&:hover": { bgcolor: "#f7f8fa" },
              }}
            >
              <Badge
                badgeContent={
                  totalUnreadCount > 0 ? totalUnreadCount : 0
                }
                color="error"
                overlap="circular"
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: 10,
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                {item.icon}
              </Badge>
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Box
          px={1.5}
          py={1.25}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          borderBottom="1px solid #edf0f4"                                          
          bgcolor="#ffffff"
        >
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <Tooltip title="Back">
              <IconButton size="small" onClick={() => window.history.back()}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Box minWidth={0}>
              <PinglyMark size={30} showWord />
              {/* <Typography variant="caption" color="text.secondary" noWrap>
                {currentUser?.email || "People and groups"}
              </Typography> */}
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.25}>
            <Tooltip title="Create group">
              <IconButton size="small" onClick={onCreateGroup}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <span>
                <IconButton size="small" onClick={onRefresh} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box p={1.5} sx={{ borderBottom: "1px solid #edf0f4" }}>
          <Box display="flex" gap={1} alignItems="center">
            <TextField
              fullWidth
              placeholder="Search chats"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "#7b8494" }} /> }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#f8fafc",
                  borderRadius: 1,
                  fontSize: 14,
                },
              }}
            />
          </Box>
        </Box>

        <Box px={1} py={1.25} sx={{ overflowY: "auto", minHeight: 0, flex: 1 }}>
          {loadError && (
            <Paper
              variant="outlined"
              sx={{ p: 1.5, mb: 1.5, bgcolor: "#fff5f5", borderColor: "#ffc9c9" }}
            >
              <Typography color="error" variant="body2">
                {loadError}
              </Typography>
              {connectUrl && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={onRefresh}
                  sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                >
                  Retry
                </Button>
              )}
            </Paper>
          )}

          <Box display="flex" alignItems="center" gap={0.75} px={1} mb={0.75}>
            <Typography variant="caption" fontWeight={800} color="text.secondary">
              {sectionTitle}
            </Typography>
          </Box>

          {loading
            ? Array.from(new Array(6)).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    alignItems: "center",
                    px: 1,
                    py: 1.25,
                    mb: 0.5,
                  }}
                >
                  <Skeleton variant="circular" width={42} height={42} />
                  <Box flex={1}>
                    <Skeleton width="55%" />
                  </Box>
                </Box>
              ))
            : filteredItems.map((item) => {
                const isChannelItem = item.__conversationType === "channel";
                return (
                <ChatListItem
                  key={
                    isChannelItem
                      ? getChannelId(item) || getChannelName(item)
                      : getBuddySendId(item) || getBuddyName(item)
                  }
                  item={item}
                  isChannel={isChannelItem}
                  selectedChat={selectedChat}
                  onSelectBuddy={onSelectBuddy}
                  onSelectChannel={onSelectChannel}
                />
                );
              })}

          {!loading && filteredItems.length === 0 && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight={220}
              textAlign="center"
              px={2}
            >
              <Avatar sx={{ mb: 1.5, bgcolor: "#edf0f4", color: "#5b6472" }}>
                <ChatBubbleIcon />
              </Avatar>
              <Typography fontWeight={700}>No results</Typography>
              <Typography color="text.secondary" variant="body2">
                No conversations match your search.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              badgeContent={
                avatarUploading ? (
                  <CircularProgress size={12} sx={{ color: "#ffffff" }} />
                ) : (
                  <PhotoCameraIcon sx={{ fontSize: 12, color: "#ffffff" }} />
                )
              }
              sx={{
                cursor: "pointer",
                "& .MuiBadge-badge": {
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  bgcolor: "#6F2DA8",
                  border: "2px solid #ffffff",
                },
              }}
              onClick={handleAvatarPick}
            >
              <Avatar
                src={getImageUrl(currentUser)}
                sx={{
                  width: 58,
                  height: 58,
                  bgcolor: "#6F2DA8",
                  fontWeight: 900,
                  fontSize: 22,
                }}
              >
                {currentUserInitial}
              </Avatar>
            </Badge>
            <Box minWidth={0}>
              <Typography variant="caption" color="text.secondary" fontWeight={800}>
                Current account
              </Typography>
              <Typography fontWeight={800} noWrap>
                {currentUserName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {currentUser?.email || "Pingly user"}
              </Typography>
            </Box>
          </Box>

          <Typography variant="caption" fontWeight={800} color="text.secondary">
            Presence
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mt={1} mb={2}>
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={option.value === currentStatus ? "contained" : "outlined"}
                disabled={statusSaving}
                onClick={() => handleStatusPick(option.value)}
                startIcon={<CircleIcon sx={{ fontSize: 12, color: option.color }} />}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  borderRadius: 1,
                  fontWeight: 700,
                  bgcolor: option.value === currentStatus ? "#6F2DA8" : undefined,
                  "&:hover": {
                    bgcolor: option.value === currentStatus ? "#5d238f" : undefined,
                  },
                }}
              >
                {option.label}
              </Button>
            ))}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="center" gap={1} minWidth={0}>
              <NotificationsActiveIcon sx={{ color: "#6F2DA8" }} />
              <Box minWidth={0}>
                <Typography fontWeight={800}>Desktop notifications</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {notificationPermission}
                </Typography>
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={handleToggleNotifications}
                  disabled={notificationPermission === "denied"}
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          </Box>
          {settingsNotice && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.25 }}
            >
              {settingsNotice}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTestNotification}>Test</Button>
          <Button variant="contained" onClick={() => setSettingsOpen(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
