import { Avatar, Badge, Box, CircularProgress, Divider, IconButton, Tooltip } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SettingsIcon from "@mui/icons-material/Settings";
import CallIcon from "@mui/icons-material/Call";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import { getImageUrl } from "../chatHelpers";
import { appRailItems, getInitial } from "./sidebarUtils";

export default function SidebarRail({
  avatarUploading,
  currentUser,
  currentUserName,
  onOpenCalls,
  onOpenMedia,
  onSettingsOpen,
  onTabSelect,
  totalUnreadCount,
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        gap: 0.75,
        borderRight: "1px solid",
        borderColor: "divider",
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
      <Divider flexItem sx={{ borderColor: "divider", my: 0.5 }} />
      {appRailItems.map((item) => (
        <Tooltip key={item.key} title={item.label} placement="right">
          <IconButton
            onClick={() => onTabSelect(item.key)}
            sx={{
              width: 40,
              height: 40,
              color: "#6F2DA8",
              bgcolor: "var(--chat-soft)",
              borderRadius: 1.5,
              "&:hover": { bgcolor: "var(--chat-subtle)" },
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
      <Tooltip title="Calls" placement="right">
        <IconButton
          onClick={onOpenCalls}
          sx={{
            width: 40,
            height: 40,
            color: "#1f7a6d",
            bgcolor: "var(--chat-soft)",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "var(--chat-subtle)" },
          }}
        >
          <CallIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Media" placement="right">
        <IconButton
          onClick={onOpenMedia}
          sx={{
            width: 40,
            height: 40,
            color: "#1f5f99",
            bgcolor: "var(--chat-blue-soft)",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "var(--chat-subtle)" },
          }}
        >
          <AttachFileIcon />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Settings" placement="right">
        <IconButton
          onClick={onSettingsOpen}
          sx={{
            width: 40,
            height: 40,
            color: "text.secondary",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "var(--chat-subtle)", color: "text.primary" },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
