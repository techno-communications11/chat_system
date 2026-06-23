import { useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import CircleIcon from "@mui/icons-material/Circle";
import GroupsIcon from "@mui/icons-material/Groups";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import PinglyMark from "./PinglyMark";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
} from "./chatNotifications";
import {
  getAvailability,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getUnreadCount,
} from "./chatHelpers";

const appRailItems = [
  { key: "people", label: "People", icon: <ChatBubbleIcon /> },
  { key: "channels", label: "Conversations", icon: <GroupsIcon /> },
];

const statusOptions = [
  { value: "online", label: "Online", color: "#22c55e" },
  { value: "away", label: "Away", color: "#f59e0b" },
  { value: "busy", label: "Busy", color: "#ef4444" },
  { value: "offline", label: "Offline", color: "#9aa3af" },
];

const getInitial = (value) => String(value || "Z").trim().charAt(0).toUpperCase();

function PresenceAvatar({ item, title, isChannel }) {
  const availability = getAvailability(item);

  if (isChannel) {
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
            <Typography fontWeight={700} noWrap flex={1}>
              {title}
            </Typography>
            {isChannel && getUnreadCount(item) > 0 && (
              <Badge
                badgeContent={getUnreadCount(item)}
                color="error"
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: 10,
                    height: 18,
                    minWidth: 18,
                  },
                }}
              />
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
  tab,
}) {
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    areChatNotificationsEnabled(),
  );
  const avatarInputRef = useRef(null);
  const isChannelTab = tab === "channels";
  const sectionTitle = isChannelTab ? "CONVERSATIONS" : "PEOPLE";
  const currentUserName = currentUser?.name || "Current user";
  const currentUserInitial = getInitial(currentUserName);
  const status =
    statusOptions.find((option) => option.value === currentStatus) ||
    statusOptions[0];

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
      return;
    }

    const permission = await requestChatNotificationPermission();
    setNotificationsEnabled(permission === "granted");
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
        <Tooltip
          title={
            currentUser?.email
              ? `${currentUserName} - ${currentUser.email}`
              : `${currentUserName} - Change profile picture`
          }
          placement="right"
        >
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              avatarUploading ? (
                <CircularProgress size={12} sx={{ color: "#ffffff" }} />
              ) : (
                <PhotoCameraIcon sx={{ fontSize: 11, color: "#ffffff" }} />
              )
            }
            sx={{
              cursor: "pointer",
              "& .MuiBadge-badge": {
                width: 18,
                height: 18,
                minWidth: 18,
                bgcolor: "#6F2DA8",
                border: "2px solid #ffffff",
              },
            }}
            onClick={handleAvatarPick}
          >
            <Avatar
              src={getImageUrl(currentUser)}
              sx={{ width: 38, height: 38, bgcolor: "#6F2DA8", fontWeight: 900 }}
            >
              {currentUserInitial}
            </Avatar>
          </Badge>
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
                color: tab === item.key ? "#6F2DA8" : "#6b7280",
                bgcolor: tab === item.key ? "#f2e9f8" : "transparent",
                borderRadius: 1.5,
                "&:hover": { bgcolor: "#f7f8fa" },
              }}
            >
              <Badge
                badgeContent={
                  item.key === "channels" && totalUnreadCount > 0
                    ? totalUnreadCount
                    : 0
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
              <PinglyMark size={25} showWord />
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentUser?.email || "People and groups"}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.25}>
            <Tooltip title="Create group">
              <IconButton size="small" onClick={onCreateGroup}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={
                notificationsEnabled
                  ? "Notifications on"
                  : "Enable notifications"
              }
            >
              <IconButton
                size="small"
                onClick={handleToggleNotifications}
                sx={{
                  color: notificationsEnabled ? "#6F2DA8" : "#6b7280",
                }}
              >
                <NotificationsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Status: ${status.label}`}>
              <span>
                <IconButton
                  size="small"
                  onClick={(event) => setStatusAnchorEl(event.currentTarget)}
                  disabled={statusSaving}
                >
                  {statusSaving ? (
                    <CircularProgress size={17} />
                  ) : (
                    <CircleIcon sx={{ fontSize: 16, color: status.color }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={statusAnchorEl}
              open={Boolean(statusAnchorEl)}
              onClose={() => setStatusAnchorEl(null)}
            >
              {statusOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  selected={option.value === currentStatus}
                  onClick={() => {
                    setStatusAnchorEl(null);
                    onStatusChange(option.value);
                  }}
                >
                  <CircleIcon sx={{ mr: 1, fontSize: 12, color: option.color }} />
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
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
            : filteredItems.map((item) => (
                <ChatListItem
                  key={
                    isChannelTab
                      ? getChannelId(item) || getChannelName(item)
                      : getBuddySendId(item) || getBuddyName(item)
                  }
                  item={item}
                  isChannel={isChannelTab}
                  selectedChat={selectedChat}
                  onSelectBuddy={onSelectBuddy}
                  onSelectChannel={onSelectChannel}
                />
              ))}

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
                {isChannelTab ? <GroupsIcon /> : <PersonIcon />}
              </Avatar>
              <Typography fontWeight={700}>No results</Typography>
              <Typography color="text.secondary" variant="body2">
                No {isChannelTab ? "conversations" : "people"} match your search.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
