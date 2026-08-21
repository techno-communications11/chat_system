import { Avatar, Badge, Box, CircularProgress, Divider, IconButton, Tooltip } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SettingsIcon from "@mui/icons-material/Settings";
import CallIcon from "@mui/icons-material/Call";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import { getImageUrl } from "../chatHelpers";
import { appRailItems, getInitial } from "./sidebarUtils";

export default function SidebarRail({
  avatarUploading,
  currentUser,
  currentUserName,
  onOpenCalls,
  onOpenMedia,
  onOpenNotes,
  onCreateGroup,
  onSettingsOpen,
  onTabSelect,
  totalUnreadCount,
}) {
  return (
    <Box
      sx={{
        bgcolor: "var(--chat-rail)",
        color: "rgba(255,255,255,.72)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        gap: 0.75,
        borderRight: "1px solid",
        borderColor: "rgba(255,255,255,.09)",
      }}
    >
      <Tooltip title={currentUserName} placement="right">
        <Avatar
          src={getImageUrl(currentUser)}
          sx={{ width: 40, height: 40, bgcolor: "#7568eb", fontWeight: 900, color: "#fff" }}
        >
          {avatarUploading ? (
            <CircularProgress size={16} sx={{ color: "#ffffff" }} />
          ) : (
            getInitial(currentUserName)
          )}
        </Avatar>
      </Tooltip>
      <Divider flexItem sx={{ borderColor: "rgba(255,255,255,.1)", my: 0.75 }} />
      {appRailItems.map((item) => (
        <Tooltip key={item.key} title={item.label} placement="right">
          <IconButton
            onClick={() => onTabSelect(item.key)}
            sx={{
              width: 40,
              height: 40,
              color: "#fff",
              bgcolor: "rgba(255,255,255,.08)",
              borderRadius: 2,
              "&:hover": { bgcolor: "rgba(255,255,255,.15)" },
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
                  bgcolor: "#ff755d",
                },
              }}
            >
              <ChatBubbleIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      ))}
      <Tooltip title="Create group" placement="right">
        <IconButton
          onClick={onCreateGroup}
          sx={{
            width: 40,
            height: 40,
            color: "#b9b2ff",
            bgcolor: "rgba(255,255,255,.08)",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,.15)" },
          }}
        >
          <GroupAddIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Calls" placement="right">
        <IconButton
          onClick={onOpenCalls}
          sx={{
            width: 40,
            height: 40,
            color: "#b9b2ff",
            bgcolor: "rgba(255,255,255,.08)",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,.15)" },
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
            color: "#b9b2ff",
            bgcolor: "rgba(255,255,255,.08)",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,.15)" },
          }}
        >
          <AttachFileIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Notes" placement="right">
        <IconButton
          onClick={onOpenNotes}
          sx={{
            width: 40,
            height: 40,
            color: "#f5c78a",
            bgcolor: "rgba(255,255,255,.08)",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,.15)" },
          }}
        >
          <StickyNote2OutlinedIcon />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Settings" placement="right">
        <IconButton
          onClick={onSettingsOpen}
          sx={{
            width: 40,
            height: 40,
            color: "rgba(255,255,255,.62)",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,.15)", color: "#fff" },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
