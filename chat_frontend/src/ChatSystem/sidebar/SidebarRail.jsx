import { Avatar, Badge, Box, CircularProgress, Divider, IconButton, Tooltip } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
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
      <Tooltip title="Calls" placement="right">
        <IconButton
          onClick={onOpenCalls}
          sx={{
            width: 40,
            height: 40,
            color: "#1f7a6d",
            bgcolor: "#e7f5f2",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "#f7f8fa" },
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
            bgcolor: "#e8f1fb",
            borderRadius: 1.5,
            "&:hover": { bgcolor: "#f7f8fa" },
          }}
        >
          <AttachFileIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
