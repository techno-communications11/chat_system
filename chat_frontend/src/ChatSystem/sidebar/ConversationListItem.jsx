import {
  Avatar,
  Badge,
  Box,
  Tooltip,
  Typography,
} from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DoneIcon from "@mui/icons-material/Done";
import GroupsIcon from "@mui/icons-material/Groups";
import {
  getAvailability,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
  getUnreadCount,
} from "../chatHelpers";
import {
  getDeliveryState,
  getInitial,
  getLastMessagePreview,
  isDirectConversation,
} from "./sidebarUtils";

function PresenceAvatar({ item, title, isChannel }) {
  const availability = getAvailability(item);
  const isDirect = isDirectConversation(item, isChannel);
  const imageUrl =
    getImageUrl(item) ||
    getImageUrl(item?.user) ||
    getImageUrl(item?.profile) ||
    getImageUrl(item?.participant) ||
    getImageUrl(item?.raw);

  if (!isDirect) {
    return (
      <Avatar
        src={imageUrl}
        sx={{
          width: 42,
          height: 42,
          bgcolor: "var(--chat-soft)",
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
          src={imageUrl}
          sx={{
            width: 42,
            height: 42,
          bgcolor: "var(--chat-blue-soft)",
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

export default function ConversationListItem({
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
  const deliveryState = getDeliveryState(item);
  const preview = getLastMessagePreview(item, isChannel);
  const unreadLabel = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <Box
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
        borderRadius: 2.5,
        bgcolor: selected ? "var(--chat-soft)" : "transparent",
        opacity: disabled ? 0.58 : 1,
        transition: "background-color 120ms ease, border-color 120ms ease",
        borderLeft: "0 solid transparent",
        "&:hover": {
          bgcolor: disabled ? "transparent" : selected ? "var(--chat-soft)" : "rgba(233,231,255,.42)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1,
          py: 1,
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
              fontSize={14}
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
              fontWeight={unreadCount > 0 ? 600 : 400}
              noWrap
              flex={1}
              minWidth={0}
            >
              {preview}
            </Typography>
            {unreadCount > 0 && (
              <Box
                component="span"
                sx={{
                  minWidth: 18,
                  height: 18,
                  px: 0.5,
                  borderRadius: "999px",
                  bgcolor: "#25D366",
                  color: "#ffffff",
                  fontSize: 10,
                  lineHeight: "18px",
                  textAlign: "center",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {unreadLabel}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
