import { useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  areChatNotificationsEnabled,
  requestChatNotificationPermission,
  setChatNotificationsEnabled,
  showChatNotification,
} from "./chatNotifications";
import {
  getImageUrl,
} from "./chatHelpers";
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
