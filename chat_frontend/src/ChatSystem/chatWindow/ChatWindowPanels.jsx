import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PushPinIcon from "@mui/icons-material/PushPin";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
  getImageUrl,
} from "../chatHelpers";

const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";

export function ToolBtn({ title, icon, disabled, onClick }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={onClick}
          sx={{
            width: 28,
            height: 28,
            borderRadius: "5px",
            color: "text.secondary",
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function PinnedMessageBanner({ latestPinnedMessage, pinnedCount }) {
  if (!latestPinnedMessage) return null;

  return (
    <Box
      px={2.5}
      py={0.85}
      display="flex"
      alignItems="center"
      gap={1}
      sx={{
        bgcolor: "var(--chat-subtle)",
        borderBottom: "0.5px solid",
        borderColor: "#fed7aa",
      }}
    >
      <PushPinIcon sx={{ fontSize: 17, color: "#9a3412", flexShrink: 0 }} />
      <Box minWidth={0} flex={1}>
        <Typography fontSize={12} fontWeight={800} color="#9a3412" noWrap>
          Pinned message
        </Typography>
        <Typography fontSize={12.5} color="text.secondary" noWrap>
          {latestPinnedMessage.text || "Attachment"}
        </Typography>
      </Box>
      {pinnedCount > 1 && (
        <Typography
          fontSize={11}
          fontWeight={700}
          color="#9a3412"
          flexShrink={0}
        >
          +{pinnedCount - 1}
        </Typography>
      )}
    </Box>
  );
}

export function ForwardMessageDialog({
  availableChats,
  forwardMessage,
  onClose,
  onForwardToChat,
  selectedChat,
}) {
  const forwardTargets = availableChats.filter((chat) => {
    const chatId =
      chat.__conversationType === "channel"
        ? getChannelId(chat)
        : getBuddySendId(chat) ||
          chat.directConversationId ||
          chat.chat_id ||
          chat.chatId;
    const selectedId =
      selectedChat?.type === "channel" ? selectedChat.id : selectedChat?.id;

    return String(chatId || "") !== String(selectedId || "");
  });

  return (
    <Dialog
      open={Boolean(forwardMessage)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Forward to</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List dense sx={{ maxHeight: 360, overflow: "auto", py: 0.5 }}>
          {forwardTargets.map((chat) => {
            const isChannel = chat.__conversationType === "channel";
            const title = isChannel ? getChannelName(chat) : getBuddyName(chat);
            const subtitle = isChannel ? "Group" : getBuddyEmail(chat);
            const key = isChannel
              ? getChannelId(chat)
              : getBuddySendId(chat) || chat.directConversationId || title;

            return (
              <ListItemButton key={key} onClick={() => onForwardToChat(chat)}>
                <Avatar
                  src={getImageUrl(chat)}
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1.25,
                    fontSize: 12,
                    bgcolor: isChannel ? BRAND_SOFT : "var(--chat-blue-soft)",
                    color: isChannel ? BRAND_TEXT : "#1a4fa0",
                  }}
                >
                  {isChannel ? (
                    <GroupsIcon sx={{ fontSize: 16 }} />
                  ) : (
                    title.charAt(0)
                  )}
                </Avatar>
                <ListItemText
                  primary={title}
                  secondary={subtitle}
                  primaryTypographyProps={{
                    noWrap: true,
                    fontSize: 13.5,
                    fontWeight: 600,
                  }}
                  secondaryTypographyProps={{ noWrap: true, fontSize: 12 }}
                />
              </ListItemButton>
            );
          })}
          {availableChats.length === 0 && (
            <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
              No chats available.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}

export function LoadingIcon({ size = 14 }) {
  return <CircularProgress size={size} />;
}
