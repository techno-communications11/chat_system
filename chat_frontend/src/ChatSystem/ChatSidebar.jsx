import { useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
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
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
} from "./chatHelpers";
import ConversationListItem from "./sidebar/ConversationListItem";
import ChatSidebarSettingsDialog from "./sidebar/ChatSidebarSettingsDialog";
import { appRailItems, getCurrentUserName, getInitial } from "./sidebar/sidebarUtils";

function SidebarRail({
  avatarUploading,
  currentUser,
  currentUserName,
  onTabSelect,
  totalUnreadCount,
}) {
  return (
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
            getInitial(currentUserName)
          )}
        </Avatar>
      </Tooltip>
      <Divider flexItem sx={{ borderColor: "#edf0f4", my: 0.5 }} />
      {appRailItems.map((item) => (
        <Tooltip key={item.key} title={item.label} placement="right">
          <IconButton
            onClick={() => onTabSelect(item.key)}
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
              badgeContent={totalUnreadCount > 0 ? totalUnreadCount : 0}
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
              <ChatBubbleIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  );
}

function SidebarHeader({
  loading,
  onCreateGroup,
  onRefresh,
  onSettingsOpen,
}) {
  return (
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
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={0.25}>
        <Tooltip title="Create group">
          <IconButton size="small" onClick={onCreateGroup}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton size="small" onClick={onSettingsOpen}>
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
  );
}

function SearchBox({ searchTerm, setSearchTerm }) {
  return (
    <Box p={1.5} sx={{ borderBottom: "1px solid #edf0f4" }}>
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
  );
}

function LoadingRows() {
  return Array.from(new Array(6)).map((_, index) => (
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
  ));
}

function ConversationList({
  connectUrl,
  filteredItems,
  loadError,
  loading,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  selectedChat,
}) {
  return (
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
          ALL CONVERSATIONS
        </Typography>
      </Box>

      {loading ? (
        <LoadingRows />
      ) : (
        filteredItems.map((item) => {
          const isChannelItem = item.__conversationType === "channel";
          return (
            <ConversationListItem
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
        })
      )}

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
  const currentUserName = getCurrentUserName(currentUser);

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
      <SidebarRail
        avatarUploading={avatarUploading}
        currentUser={currentUser}
        currentUserName={currentUserName}
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
          loading={loading}
          onCreateGroup={onCreateGroup}
          onRefresh={onRefresh}
          onSettingsOpen={() => setSettingsOpen(true)}
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
        notificationsEnabled={notificationsEnabled}
        onAvatarPick={handleAvatarPick}
        onClose={() => setSettingsOpen(false)}
        onStatusPick={onStatusChange}
        onTestNotification={handleTestNotification}
        onToggleNotifications={handleToggleNotifications}
        open={settingsOpen}
        settingsNotice={settingsNotice}
        statusSaving={statusSaving}
      />
    </Box>
  );
}
