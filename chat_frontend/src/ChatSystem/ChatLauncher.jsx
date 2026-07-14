import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import VideocamIcon from "@mui/icons-material/Videocam";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import PinglyMark from "./PinglyMark";
import { useChatRealtime } from "./useChatRealtime";
import {
  requestChatNotificationPermission,
  showChatNotification,
} from "./chatNotifications";
import {
  openDirectChatService,
  getChatUsersService,
  getChatConversationsService,
  startConversationCallService,
} from "../Services/chat.services";
import {
  getArrayPayload,
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

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const isCurrentUserRecord = (item, currentUser) => {
  const currentUserId = String(
    currentUser?.id || currentUser?.userId || currentUser?.user_id || "",
  );
  const currentUserEmail = String(
    currentUser?.email || currentUser?.email_id || currentUser?.mailid || "",
  ).toLowerCase();
  const itemId = String(getBuddySendId(item) || "");
  const itemEmail = String(getBuddyEmail(item) || "").toLowerCase();

  return (
    (currentUserId && itemId === currentUserId) ||
    (currentUserEmail && itemEmail === currentUserEmail)
  );
};

const isSelfConversation = (conversation, currentUser) => {
  const participants = Array.isArray(conversation?.participants)
    ? conversation.participants
    : [];
  const isDirect =
    conversation?.isDirect ||
    conversation?.type === "direct" ||
    conversation?.conversationType === "direct";

  if (!isDirect) return false;
  if (participants.length > 0) {
    return participants.every((participant) =>
      isCurrentUserRecord(participant, currentUser),
    );
  }

  const currentUserName = String(currentUser?.name || "").toLowerCase();
  const currentUserEmail = String(currentUser?.email || "").toLowerCase();
  const title = String(conversation?.title || conversation?.name || "").toLowerCase();

  return (
    title === "myself" ||
    title === "me" ||
    (currentUserName && title === currentUserName) ||
    (currentUserEmail && title === currentUserEmail)
  );
};

const openChatInNewTab = (chatId) => {
  const path = chatId
    ? `${CHAT_APP_BASE_PATH}/${encodeURIComponent(chatId)}`
    : CHAT_APP_BASE_PATH;
  window.open(path, "_blank", "noopener,noreferrer");
};

const openCall = async (buddy) => {
  const sendId = getBuddySendId(buddy);

  if (!sendId) {
    openChatInNewTab();
    return;
  }

  try {
    const openResponse = await openDirectChatService(sendId);
    const chatId =
      openResponse.data?.data?.chat_id ||
      openResponse.data?.data?.data?.chat_id ||
      null;

    if (chatId) {
      await startConversationCallService(chatId, "video");
    }

    openChatInNewTab(sendId);
  } catch {
    openChatInNewTab(sendId);
  }
};

export default function ChatLauncher() {
  const [buddies, setBuddies] = useState([]);
  const [channels, setChannels] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const fetchChatData = useCallback(async () => {
    try {
      const currentUser = getCurrentUser();
      const [buddyResponse, channelResponse] = await Promise.all([
        getChatUsersService({ excludeSelf: true }),
        getChatConversationsService(),
      ]);

      setBuddies(
        getArrayPayload(buddyResponse.data?.data)
          .filter((buddy) => !isCurrentUserRecord(buddy, currentUser))
          .slice(0, 8),
      );
      setChannels(
        getArrayPayload(channelResponse.data?.data)
          .filter((channel) => !isSelfConversation(channel, currentUser))
          .slice(0, 5),
      );
    } catch {
      setBuddies([]);
      setChannels([]);
    }
  }, []);

  useEffect(() => {
    fetchChatData();
    requestChatNotificationPermission().catch(() => {});
  }, [fetchChatData]);

  const totalUnreadCount = useMemo(
    () => channels.reduce((total, channel) => total + getUnreadCount(channel), 0),
    [channels],
  );

  useChatRealtime({
    enabled: true,
    onMessage: () => {
      fetchChatData();
    },
    onReactionAdded: ({ chatId, reaction, message }) => {
      const actorName =
        reaction?.actor?.name ||
        reaction?.actor?.display_name ||
        reaction?.actor?.email ||
        "Someone";
      const messagePreview = getMessageText(message);

      showChatNotification({
        title: `${actorName} reacted ${reaction?.emoji || ""}`.trim(),
        body: messagePreview ? `To your message: ${messagePreview}` : "To your message",
        icon: getImageUrl(reaction?.actor),
        tag: `reaction-${chatId}-${message?.id || message?.message_id || ""}`,
        onClick: () => openChatInNewTab(),
      });
    },
    onAvatar: () => {
      fetchChatData();
    },
  });

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {buddies.length > 0 && (
        <AvatarGroup
          max={4}
          sx={{
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              fontSize: 13,
              borderColor: "#ffffff",
              cursor: "pointer",
            },
          }}
        >
          {buddies.slice(0, 4).map((buddy) => {
            const sendId = getBuddySendId(buddy);
            const name = getBuddyName(buddy);
            const email = getBuddyEmail(buddy);
            const availability = getAvailability(buddy);

            return (
              <Tooltip
                key={sendId || email || name}
                title={`${name} - ${availability.label}`}
              >
                <Avatar
                  src={getImageUrl(buddy)}
                  alt={name}
                  onClick={() => sendId && openChatInNewTab(sendId)}
                  sx={{
                    bgcolor: "#e7f0ff",
                    color: "#215db0",
                    fontWeight: 800,
                    outline: `2px solid ${availability.color}`,
                    outlineOffset: -2,
                  }}
                >
                  {name.charAt(0)}
                </Avatar>
              </Tooltip>
            );
          })}
        </AvatarGroup>
      )}

      <Tooltip title="Open Pingly">
        <IconButton
          onClick={handleOpen}
          sx={{
            color: "#ffffff",
            bgcolor: "rgba(255,255,255,0.12)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
        >
          <Badge badgeContent={totalUnreadCount} color="error">
            <ChatBubbleOutlineIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box p={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <PinglyMark size={28} showWord />
              <Typography variant="caption" color="text.secondary">
                People and groups
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Open Pingly">
                <IconButton onClick={() => openChatInNewTab()}>
                  <ChatBubbleOutlineIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        <Box px={1.5} pt={1.25}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            People
          </Typography>
        </Box>
        <List dense disablePadding sx={{ maxHeight: 260, overflowY: "auto" }}>
          {buddies.map((buddy) => {
            const name = getBuddyName(buddy);
            const sendId = getBuddySendId(buddy);
            const availability = getAvailability(buddy);

            return (
              <ListItemButton
                key={sendId || getBuddyEmail(buddy) || name}
                onClick={() => sendId && openChatInNewTab(sendId)}
              >
                <ListItemAvatar>
                  <Avatar src={getImageUrl(buddy)}>{name.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={name}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: availability.color,
                        }}
                      />
                      <Typography variant="caption">
                        {availability.label}
                      </Typography>
                    </Stack>
                  }
                />
                <Tooltip title="Google Meet">
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      openCall(buddy);
                    }}
                  >
                    <VideocamIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            );
          })}
          {buddies.length === 0 && (
            <Box px={2} py={2}>
              <Typography variant="body2" color="text.secondary">
                No people available.
              </Typography>
            </Box>
          )}
        </List>

        <Divider />

        <Box px={1.5} pt={1.25}>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Groups / Channels
          </Typography>
        </Box>
        <List dense disablePadding sx={{ maxHeight: 180, overflowY: "auto" }}>
          {channels.map((channel) => {
            const channelId = getChannelId(channel);
            const name = getChannelName(channel);

            return (
              <ListItemButton
                key={channelId || name}
                onClick={() => channelId && openChatInNewTab(channelId)}
              >
                <ListItemAvatar>
                  <Avatar src={getImageUrl(channel)}>
                    <GroupsIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={name} secondary={channelId} />
                <Chip label="Group" size="small" variant="outlined" />
              </ListItemButton>
            );
          })}
          {channels.length === 0 && (
            <Box px={2} py={2}>
              <Typography variant="body2" color="text.secondary">
                No conversations available.
              </Typography>
            </Box>
          )}
        </List>
      </Popover>
    </Box>
  );
}
