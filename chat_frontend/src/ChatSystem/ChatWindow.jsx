import { Fragment, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CodeIcon from "@mui/icons-material/Code";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ForwardIcon from "@mui/icons-material/Forward";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PushPinIcon from "@mui/icons-material/PushPin";
import ReplyIcon from "@mui/icons-material/Reply";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import {
  getAvailability,
  getBuddyEmail,
  getBuddyName,
  getChannelId,
  getChannelName,
  getBuddySendId,
  formatMessageDateLabel,
  getMessageDayKey,
  getImageUrl,
  getMessageText,
} from "./chatHelpers";
import { searchChatMessagesService } from "../Services/chat.services";
import GroupActions from "./chatWindow/GroupActions";
import {
  ChatWindowSidebar,
  EmptyChatState,
  ReadyToSendState,
} from "./chatWindow/ChatWindowStates";
import {
  ForwardMessageDialog,
  PinnedMessageBanner,
  ToolBtn,
} from "./chatWindow/ChatWindowPanels";
import CallStatusBanner from "./calls/CallStatusBanner";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND = "#6F2DA8";
const BRAND_DARK = "#5d238f";
const BRAND_SOFT = "#ede9f8";
const BRAND_TEXT = "#4a1e72";
const SIDEBAR_BG = "#1a0a2e";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ selectedChat, setSelectedChat, chats = [] }) {
  const channels = chats.filter((c) => c.type === "channel");

  return (
    <Box
      sx={{
        flexShrink: 0,
        bgcolor: SIDEBAR_BG,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Channels */}
      {channels.length > 0 && (
        <>
          <Typography
            fontSize={11}
            fontWeight={500}
            sx={{
              color: "rgba(255,255,255,.35)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              px: 1.25,
              pt: 2,
              pb: 0.75,
            }}
          >
            Channels
          </Typography>
          {channels.map((chat) => (
            <SidebarItem
              key={chat.id}
              chat={chat}
              active={selectedChat?.id === chat.id}
              onClick={() => setSelectedChat(chat)}
            />
          ))}
        </>
      )}
    </Box>
  );
}

function SidebarItem({ chat, active, onClick }) {
  const availability = getAvailability(chat.raw);
  const isChannel = chat.type === "channel";

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mx: 0.5,
        px: 1,
        py: 0.625,
        borderRadius: "6px",
        cursor: "pointer",
        bgcolor: active ? "rgba(255,255,255,.12)" : "transparent",
        "&:hover": {
          bgcolor: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)",
        },
        transition: "background 0.12s",
      }}
    >
      {isChannel ? (
        <Typography
          fontSize={13}
          sx={{ color: "rgba(255,255,255,.35)", lineHeight: 1, flexShrink: 0 }}
        >
          #
        </Typography>
      ) : (
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            src={chat.imageUrl}
            sx={{
              width: 20,
              height: 20,
              fontSize: 9,
              fontWeight: 600,
              bgcolor: BRAND_SOFT,
              color: BRAND_TEXT,
            }}
          >
            {chat.title.charAt(0)}
          </Avatar>
          {availability?.color === "#22c55e" && (
            <Box
              sx={{
                position: "absolute",
                bottom: -1,
                right: -1,
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#22c55e",
                border: `1.5px solid ${SIDEBAR_BG}`,
              }}
            />
          )}
        </Box>
      )}
      <Typography
        fontSize={13}
        noWrap
        sx={{
          color: active ? "#fff" : "rgba(255,255,255,.7)",
          fontWeight: active ? 500 : 400,
          flex: 1,
          minWidth: 0,
        }}
      >
        {chat.title}
      </Typography>
      {chat.unreadCount > 0 && (
        <Box
          sx={{
            fontSize: 10,
            fontWeight: 600,
            bgcolor: BRAND,
            color: "#fff",
            borderRadius: "999px",
            px: 0.75,
            minWidth: 18,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {chat.unreadCount}
        </Box>
      )}
    </Box>
  );
}

// ─── Reaction emoji list ──────────────────────────────────────────────────────
const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EMOJI_OPTIONS = [
  "😀",
  "😁",
  "😂",
  "😊",
  "😍",
  "😎",
  "😢",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🎉",
  "🔥",
  "❤️",
  "💯",
  "✅",
  "⭐",
  "🚀",
];

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getUniquePeople = (people = []) => {
  const seen = new Set();

  return people.filter((person) => {
    const key = String(
      getBuddySendId(person) || getBuddyEmail(person) || getBuddyName(person),
    )
      .trim()
      .toLowerCase();

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getGroupMembers = (chat) =>
  getUniquePeople(
    Array.isArray(chat?.raw?.participants) ? chat.raw.participants : [],
  );

const isSamePerson = (first, second) => {
  const firstIds = [
    first?.id,
    first?.userId,
    first?.user_id,
    first?.appUserId,
    first?.email,
    first?.email_id,
    first?.mailid,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  const secondIds = [
    second?.id,
    second?.userId,
    second?.user_id,
    second?.appUserId,
    second?.email,
    second?.email_id,
    second?.mailid,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  return firstIds.some((value) => secondIds.includes(value));
};

const getGroupMemberSummary = (chat, currentUser) => {
  const names = getGroupMembers(chat)
    .map((member) =>
      isSamePerson(member, currentUser) ? "You" : getBuddyName(member),
    )
    .filter(Boolean);

  if (names.length === 0) return chat?.subtitle || "Group chat";
  if (names.length <= 4) return names.join(", ");
  return `${names.slice(0, 4).join(", ")} +${names.length - 4}`;
};

const getAuthorColor = (value) => {
  const palette = [
    "#008069",
    "#8b5cf6",
    "#f97316",
    "#0ea5e9",
    "#dc2626",
    "#16a34a",
  ];
  const text = String(value || "");
  const total = Array.from(text).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return palette[total % palette.length];
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMentionLabels = (message, mentionableUsers = []) => {
  const labels = new Set();

  (message.mentions || message.metadata?.mentions || []).forEach((mention) => {
    [mention?.displayName, mention?.name, mention?.email]
      .filter(Boolean)
      .forEach((value) => labels.add(String(value).trim().toLowerCase()));
  });

  mentionableUsers.forEach((user) => {
    [getBuddyName(user), getBuddyEmail(user)]
      .filter(Boolean)
      .forEach((value) => labels.add(String(value).trim().toLowerCase()));
  });

  return Array.from(labels).filter(Boolean);
};

function MessageText({ message, mentionableUsers }) {
  const text = String(message.text || "");
  const mentionLabels = getMentionLabels(message, mentionableUsers);

  if (message.metadata?.kind === "call_history") {
    return (
      <Box component="span" display="inline-flex" alignItems="center" gap={0.75} fontWeight={700}>
        <VideoCallIcon sx={{ fontSize: 18, color: BRAND }} />
        {text}
      </Box>
    );
  }

  if (!text || mentionLabels.length === 0) {
    return <>{text}</>;
  }

  const mentionPattern = new RegExp(
    `@(${mentionLabels.map(escapeRegExp).join("|")})(?=\\s|$|[.,!?;:])`,
    "gi",
  );
  const parts = text.split(mentionPattern);
  const matches = text.match(mentionPattern) || [];

  return parts.map((part, index) => {
    if (index % 2 === 0) return part;

    const mentionText = matches[(index - 1) / 2] || `@${part}`;
    return (
      <Box
        key={`${mentionText}-${index}`}
        component="span"
        sx={{
          display: "inline",
          px: 0.4,
          py: 0.1,
          borderRadius: "4px",
          bgcolor: BRAND_SOFT,
          color: BRAND_TEXT,
          fontWeight: 700,
        }}
      >
        {mentionText}
      </Box>
    );
  });
}

// ─── Message row (Slack-style) ────────────────────────────────────────────────
function MessageRow({
  message,
  currentUser,
  mentionableUsers = [],
  onEdit,
  onForward,
  onPin,
  onReact,
  onReply,
  showAvatar = true,
  authorName,
}) {
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const dragStartXRef = useRef(null);
  const dragStartYRef = useRef(null);
  const isMe = message.direction === "outbound";
  const actionsOpen = Boolean(actionAnchorEl);

  const handleReact = (emoji) => {
    if (isMe) return;
    onReact?.(message.id, emoji);
    setPickerAnchor(null);
  };

  const handlePointerDown = (event) => {
    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
  };

  const handlePointerUp = (event) => {
    if (dragStartXRef.current == null || dragStartYRef.current == null) return;

    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = Math.abs(event.clientY - dragStartYRef.current);
    dragStartXRef.current = null;
    dragStartYRef.current = null;

    if (Math.abs(deltaX) > 72 && deltaY < 32) {
      onReply?.(message);
      setActionAnchorEl(null);
    }
  };

  const handleMessageClick = (event) => {
    setActionAnchorEl((anchor) => (anchor ? null : event.currentTarget));
  };

  const closeActions = () => {
    setActionAnchorEl(null);
  };

  const replyToMessage = () => {
    onReply?.(message);
    closeActions();
  };

  const editMessage = () => {
    onEdit?.(message);
    closeActions();
  };

  const forwardMessage = () => {
    onForward?.(message);
    closeActions();
  };

  const pinMessage = () => {
    onPin?.(message);
    closeActions();
  };

  const avatarBg = BRAND_SOFT;
  const avatarColor = BRAND_TEXT;
  const currentUserName = getBuddyName(currentUser);
  const initials = isMe
    ? currentUserName.charAt(0)
    : (authorName || "?").charAt(0);
  const avatar = (
    <Avatar
      src={isMe ? getImageUrl(currentUser) : message.authorAvatarUrl}
      sx={{
        width: 34,
        height: 34,
        borderRadius: "8px",
        fontSize: 12,
        fontWeight: 700,
        bgcolor: isMe ? BRAND_SOFT : avatarBg,
        color: isMe ? BRAND_TEXT : avatarColor,
      }}
    >
      {initials}
    </Avatar>
  );

  return (
    <Box
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      sx={{
        display: "flex",
        justifyContent: isMe ? "flex-end" : "flex-start",
        gap: 1.25,
        px: 1,
        py: 0.625,
        borderRadius: "6px",
        position: "relative",
        "&:hover": { bgcolor: "transparent" },
        mt: showAvatar ? 0.75 : 0,
      }}
    >
      {/* Avatar column */}
      <Box sx={{ width: 34, flexShrink: 0, display: isMe ? "none" : "block" }}>
        {showAvatar && !isMe ? avatar : null}
      </Box>

      {/* Content */}
      <Box
        minWidth={0}
        onClick={handleMessageClick}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMe ? "flex-end" : "flex-start",
          maxWidth: { xs: "82%", md: "68%" },
        }}
      >
        {showAvatar && !isMe && (
          <Box
            display="flex"
            alignItems="baseline"
            gap={0.875}
            mb={0.375}
            sx={{ justifyContent: "flex-start" }}
          >
            <Typography
              fontSize={12.5}
              fontWeight={700}
              color={getAuthorColor(message.authorId || authorName)}
            >
              {authorName}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            px: 1.4,
            py: 0.9,
            borderRadius: isMe ? "10px 2px 10px 10px" : "2px 10px 10px 10px",
            bgcolor: isMe ? "#dcf8c6" : "#ffffff",
            border: isMe ? "none" : "0.5px solid",
            borderColor: "divider",
            boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
            maxWidth: "100%",
          }}
        >
          {message.metadata?.pinned && (
            <Box display="flex" alignItems="center" gap={0.4} mb={0.5}>
              <PushPinIcon sx={{ fontSize: 12, color: "text.secondary" }} />
              <Typography fontSize={11} fontWeight={700} color="text.secondary">
                Pinned
              </Typography>
            </Box>
          )}
          {message.metadata?.forwardedFrom && (
            <Typography
              fontSize={11}
              fontWeight={700}
              color="text.secondary"
              sx={{ display: "block", mb: 0.5, fontStyle: "italic" }}
            >
              Forwarded
            </Typography>
          )}
          {message.repliedMessage && (
            <Box
              sx={{
                mb: 0.75,
                borderLeft: `3px solid ${BRAND}`,
                pl: 1,
                color: "text.secondary",
              }}
            >
              <Typography
                fontSize={11}
                fontWeight={700}
                color={BRAND_TEXT}
                noWrap
              >
                Replying to{" "}
                {message.repliedMessage.direction === "outbound"
                  ? "you"
                  : authorName}
              </Typography>
              <Typography fontSize={11.5} noWrap sx={{ maxWidth: 280 }}>
                {message.repliedMessage.text || "Attachment"}
              </Typography>
            </Box>
          )}
          <Typography
            fontSize={13.5}
            color="text.primary"
            lineHeight={1.55}
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            <MessageText
              message={message}
              mentionableUsers={mentionableUsers}
            />
          </Typography>
          {message.edited && (
            <Typography
              component="span"
              fontSize={10}
              color="text.secondary"
              sx={{ display: "block", textAlign: "right", mt: 0.25 }}
            >
              edited
            </Typography>
          )}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
            gap={0.35}
            mt={0.3}
            minWidth={44}
            sx={{ lineHeight: 1.2, whiteSpace: "nowrap" }}
          >
            <Typography component="span" fontSize={10} color="text.secondary">
              {message.timestamp || ""}
            </Typography>
            {isMe && (
              <Tooltip title={message.deliveryStatus === "seen" ? "Seen" : "Sent"} arrow>
                {message.deliveryStatus === "seen" ? (
                  <DoneAllIcon sx={{ fontSize: 15, color: "#2196f3" }} />
                ) : (
                  <DoneIcon sx={{ fontSize: 15, color: "#7b8794" }} />
                )}
              </Tooltip>
            )}
          </Box>
        </Box>

        {message.attachments?.length > 0 && (
          <Stack
            spacing={0.75}
            mt={message.text ? 0.75 : 0}
            alignItems={isMe ? "flex-end" : "flex-start"}
          >
            {message.attachments.map((file) => {
              const meta = [file.contentType, formatFileSize(file.size)]
                .filter(Boolean)
                .join(" - ");

              return (
                <Box
                  key={file.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    maxWidth: 360,
                    border: "0.5px solid",
                    borderColor: "divider",
                    borderRadius: "7px",
                    px: 1,
                    py: 0.875,
                    bgcolor: "#fafafa",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "6px",
                      bgcolor: BRAND_SOFT,
                      color: BRAND_TEXT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <InsertDriveFileIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box minWidth={0}>
                    {file.url ? (
                      <Link
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        underline="hover"
                        fontSize={13}
                        fontWeight={600}
                        color="text.primary"
                        sx={{ display: "block" }}
                      >
                        <Typography
                          component="span"
                          fontSize={13}
                          fontWeight={600}
                          noWrap
                        >
                          {file.name}
                        </Typography>
                      </Link>
                    ) : (
                      <Typography fontSize={13} fontWeight={600} noWrap>
                        {file.name}
                      </Typography>
                    )}
                    {meta && (
                      <Typography fontSize={11} color="text.secondary" noWrap>
                        {meta}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.75}>
            {message.reactions.map((r) => (
              <Box
                key={r.emoji}
                onClick={(event) => {
                  event.stopPropagation();
                  handleReact(r.emoji);
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: "999px",
                  border: "0.5px solid",
                  borderColor: r.reacted ? "#a78bfa" : "divider",
                  bgcolor: r.reacted ? "#f3e8ff" : "background.paper",
                  fontSize: 12,
                  color: r.reacted ? "#6d28d9" : "text.secondary",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  "&:hover": {
                    borderColor: "#a78bfa",
                    bgcolor: "#f3e8ff",
                    color: "#6d28d9",
                  },
                }}
              >
                <span>{r.emoji}</span>
                <span>{r.count || 1}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Popover
        open={actionsOpen}
        anchorEl={actionAnchorEl}
        onClose={closeActions}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isMe ? "right" : "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: isMe ? "right" : "left",
        }}
        PaperProps={{
          sx: {
            minWidth: 190,
            overflow: "hidden",
            borderRadius: "8px",
            border: "0.5px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          },
        }}
      >
        {!isMe && (
          <Box
            display="flex"
            justifyContent="space-between"
            px={1}
            py={0.75}
            sx={{ borderBottom: "0.5px solid", borderColor: "divider" }}
          >
            {REACTION_OPTIONS.slice(0, 5).map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => {
                  handleReact(emoji);
                  closeActions();
                }}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  fontSize: 17,
                }}
              >
                {emoji}
              </IconButton>
            ))}
            <IconButton
              size="small"
              onClick={(event) => {
                setPickerAnchor(event.currentTarget);
                closeActions();
              }}
              sx={{ width: 30, height: 30, borderRadius: "50%" }}
            >
              <EmojiEmotionsIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
        )}
        <List dense disablePadding>
          <ListItemButton onClick={replyToMessage} sx={{ gap: 1.25, py: 1 }}>
            <ReplyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Reply"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
          {isMe && (
            <ListItemButton onClick={editMessage} sx={{ gap: 1.25, py: 1 }}>
              <EditIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <ListItemText
                primary="Edit"
                primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
              />
            </ListItemButton>
          )}
          <ListItemButton onClick={forwardMessage} sx={{ gap: 1.25, py: 1 }}>
            <ForwardIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Forward"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
          <ListItemButton onClick={pinMessage} sx={{ gap: 1.25, py: 1 }}>
            <PushPinIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary={message.metadata?.pinned ? "Unpin" : "Pin"}
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
        </List>
      </Popover>

      {/* Full reaction picker */}
      {!isMe && (
        <Popover
          open={Boolean(pickerAnchor)}
          anchorEl={pickerAnchor}
          onClose={() => setPickerAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          PaperProps={{
            sx: {
              p: "6px 8px",
              borderRadius: "10px",
              border: "0.5px solid",
              borderColor: "divider",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            },
          }}
        >
          <Stack direction="row" spacing={0.25}>
            {REACTION_OPTIONS.map((emoji) => (
              <Box
                key={emoji}
                onClick={() => handleReact(emoji)}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "7px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  cursor: "pointer",
                  transition: "transform 0.12s, background 0.12s",
                  "&:hover": { bgcolor: BRAND_SOFT, transform: "scale(1.18)" },
                }}
              >
                {emoji}
              </Box>
            ))}
          </Stack>
        </Popover>
      )}
    </Box>
  );
}

// ─── Toolbar icon button ──────────────────────────────────────────────────────

// ─── Main ChatWindow ──────────────────────────────────────────────────────────
export default function ChatWindow({
  activeCall,
  availableChats = [],
  callStarting = false,
  chatBoxRef,
  chats,
  currentUser,
  currentMessages,
  editingMessage,
  handleFileUpload,
  handleCancelComposerMode,
  handleEditMessage,
  handleForwardMessage,
  handlePinMessage,
  handleReaction,
  handleReplyToMessage,
  handleSend,
  onEndActiveCall,
  onLeaveGroup,
  inputValue,
  mentionableUsers = [],
  mutedGroupIds = [],
  pendingFiles = [],
  removePendingFile,
  selectedChat,
  sendError,
  sending,
  replyToMessage,
  onStartConversationCall,
  onOpenAddMembers,
  onToggleGroupMute,
  setInputValue,
  setSelectedChat,
  uploading,
}) {
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [messageSearchError, setMessageSearchError] = useState("");
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const availability = selectedChat ? getAvailability(selectedChat.raw) : null;
  const groupMembers =
    selectedChat?.type === "channel" ? getGroupMembers(selectedChat) : [];
  const groupMenuOpen = Boolean(groupMenuAnchorEl);
  const isGroupMuted =
    selectedChat?.type === "channel" &&
    mutedGroupIds.includes(String(selectedChat.id));
  const mentionPickerOpen = Boolean(mentionAnchorEl);
  const emojiPickerOpen = Boolean(emojiAnchorEl);
  const messageSearchOpen = Boolean(searchAnchorEl);
  const canSend = Boolean(inputValue.trim()) || pendingFiles.length > 0;
  const pinnedMessages = currentMessages.filter(
    (message) => message.metadata?.pinned,
  );
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1] || null;

  const closeGroupMenu = () => {
    setGroupMenuAnchorEl(null);
  };

  const openGroupInfo = () => {
    setGroupInfoOpen(true);
    closeGroupMenu();
  };

  const toggleGroupMute = () => {
    onToggleGroupMute?.(selectedChat?.id);
    closeGroupMenu();
  };

  const openLeaveConfirm = () => {
    setLeaveConfirmOpen(true);
    closeGroupMenu();
  };

  const insertMention = (user) => {
    const name = getBuddyName(user);
    const spacer = inputValue && !inputValue.endsWith(" ") ? " " : "";
    setInputValue(`${inputValue}${spacer}@${name} `);
    setMentionAnchorEl(null);
  };

  const insertEmoji = (emoji) => {
    setInputValue(`${inputValue}${emoji}`);
    setEmojiAnchorEl(null);
  };

  const runMessageSearch = async () => {
    const search = messageSearchTerm.trim();
    if (!search) return;

    setMessageSearchLoading(true);
    setMessageSearchError("");

    try {
      const response = await searchChatMessagesService({ search, limit: 25 });
      const results =
        response.data?.data?.messages ||
        response.data?.data?.data ||
        response.data?.data ||
        [];
      setMessageSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      setMessageSearchError(
        error?.response?.data?.message || error.message || "Search failed.",
      );
    } finally {
      setMessageSearchLoading(false);
    }
  };

  // Group consecutive messages from the same author on the same day.
  const messagesById = currentMessages.reduce((map, message) => {
    map.set(String(message.id), message);
    return map;
  }, new Map());
  const groupedMessages = currentMessages.map((msg, i) => {
    const prev = currentMessages[i - 1];
    const startsNewDay =
      !prev || getMessageDayKey(prev.sentAt) !== getMessageDayKey(msg.sentAt);
    const showAvatar =
      startsNewDay ||
      prev.direction !== msg.direction ||
      prev.authorId !== msg.authorId;
    return {
      ...msg,
      dateLabel: startsNewDay ? formatMessageDateLabel(msg.sentAt) : "",
      showAvatar,
      repliedMessage: msg.replyTo
        ? messagesById.get(String(msg.replyTo))
        : null,
    };
  });

  const openForwardDialog = (message) => {
    setForwardMessage(message);
  };

  const closeForwardDialog = () => {
    setForwardMessage(null);
  };

  const forwardToChat = async (target) => {
    if (!forwardMessage || !target) return;
    await handleForwardMessage?.(forwardMessage, target);
    closeForwardDialog();
  };

  return (
    <>
      <Box
        className={selectedChat ? "d-flex" : "d-none d-md-flex"}
        sx={{ minHeight: 0 }}
      >
        {/* Sidebar */}
        <Sidebar
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          chats={chats || availableChats}
        />

        {selectedChat ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              bgcolor: "#fff",
            }}
          >
            {/* ── Header ── */}
            <Box
              px={2.5}
              py={1.25}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              bgcolor="#fff"
              borderBottom="0.5px solid"
              sx={{ borderColor: "divider" }}
            >
              <Box display="flex" alignItems="center" gap={1.25}>
                <IconButton
                  size="small"
                  sx={{ display: { md: "none", xs: "inline-flex" } }}
                  onClick={() => setSelectedChat(null)}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>

                <Avatar
                  src={selectedChat.imageUrl}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    fontSize: 13,
                    fontWeight: 600,
                    bgcolor:
                      selectedChat.type === "channel" ? BRAND_SOFT : "#e7f0ff",
                    color:
                      selectedChat.type === "channel" ? BRAND_TEXT : "#1a4fa0",
                  }}
                >
                  {selectedChat.type === "channel" ? (
                    <GroupsIcon sx={{ fontSize: 16 }} />
                  ) : (
                    selectedChat.title.charAt(0)
                  )}
                </Avatar>

                <Box>
                  <Typography
                    fontWeight={600}
                    fontSize={14}
                    color="text.primary"
                  >
                    {selectedChat.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    {selectedChat.type !== "channel" && availability && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: availability.color,
                        }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontSize={11}
                    >
                      {selectedChat.type === "channel"
                        ? getGroupMemberSummary(selectedChat, currentUser)
                        : `${availability?.label || "Unknown"} · ${selectedChat.subtitle}`}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <ToolBtn
                  title="Search messages"
                  icon={<SearchIcon sx={{ fontSize: 16 }} />}
                  onClick={(event) => setSearchAnchorEl(event.currentTarget)}
                />
                {selectedChat.type === "channel" && (
                  <ToolBtn
                    title="Add people"
                    icon={<GroupAddIcon sx={{ fontSize: 17 }} />}
                    onClick={onOpenAddMembers}
                  />
                )}
                <ToolBtn
                  title="Google Meet"
                  icon={callStarting ? <CircularProgress size={14} /> : <VideoCallIcon sx={{ fontSize: 17 }} />}
                  disabled={callStarting}
                  onClick={() => onStartConversationCall?.("video")}
                />
                <Box
                  sx={{
                    width: 0.5,
                    height: 18,
                    bgcolor: "divider",
                    mx: 0.5,
                  }}
                />
                <ToolBtn
                  title="More"
                  icon={<MoreHorizIcon sx={{ fontSize: 17 }} />}
                  onClick={(event) => setGroupMenuAnchorEl(event.currentTarget)}
                />
              </Stack>
            </Box>

            {/* ── Messages ── */}
            <GroupActions
              anchorEl={groupMenuAnchorEl}
              currentUser={currentUser}
              groupInfoOpen={groupInfoOpen}
              groupMembers={groupMembers}
              isGroupMuted={isGroupMuted}
              isSamePerson={isSamePerson}
              leaveConfirmOpen={leaveConfirmOpen}
              onCloseInfo={() => setGroupInfoOpen(false)}
              onCloseLeaveConfirm={() => setLeaveConfirmOpen(false)}
              onCloseMenu={closeGroupMenu}
              onLeaveGroup={onLeaveGroup}
              onOpenInfo={openGroupInfo}
              onOpenLeaveConfirm={openLeaveConfirm}
              onToggleMute={toggleGroupMute}
              open={groupMenuOpen}
              selectedChat={selectedChat}
            />

            <CallStatusBanner
              activeCall={activeCall}
              onEnd={onEndActiveCall}
            />
            <PinnedMessageBanner
              latestPinnedMessage={latestPinnedMessage}
              pinnedCount={pinnedMessages.length}
            />

            <Popover
              open={messageSearchOpen}
              anchorEl={searchAnchorEl}
              onClose={() => setSearchAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  width: 340,
                  maxWidth: "calc(100vw - 32px)",
                  borderRadius: "10px",
                  border: "0.5px solid",
                  borderColor: "divider",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  p: 1.25,
                },
              }}
            >
              <Stack direction="row" spacing={1}>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  placeholder="Search messages"
                  value={messageSearchTerm}
                  onChange={(event) => setMessageSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runMessageSearch();
                  }}
                />
                <Button
                  variant="contained"
                  onClick={runMessageSearch}
                  disabled={messageSearchLoading || !messageSearchTerm.trim()}
                  sx={{ textTransform: "none", bgcolor: BRAND }}
                >
                  {messageSearchLoading ? (
                    <CircularProgress color="inherit" size={16} />
                  ) : (
                    "Go"
                  )}
                </Button>
              </Stack>
              {messageSearchError && (
                <Typography color="error" fontSize={12} sx={{ mt: 1 }}>
                  {messageSearchError}
                </Typography>
              )}
              <List
                dense
                sx={{ maxHeight: 260, overflow: "auto", mt: 1, py: 0 }}
              >
                {messageSearchResults.map((result) => (
                  <ListItemButton
                    key={result.id || result.message_id}
                    sx={{ borderRadius: "6px" }}
                  >
                    <ListItemText
                      primary={getMessageText(result)}
                      secondary={
                        result.createdAt || result.timestamp || result.sentAt
                      }
                      primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
                    />
                  </ListItemButton>
                ))}
                {!messageSearchLoading &&
                  messageSearchTerm.trim() &&
                  messageSearchResults.length === 0 && (
                    <Typography
                      color="text.secondary"
                      fontSize={12}
                      sx={{ px: 1, py: 1 }}
                    >
                      No matches yet.
                    </Typography>
                  )}
              </List>
            </Popover>

            <Box
              ref={chatBoxRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                px: 1.5,
                py: 2,
                bgcolor: "#fff",
              }}
            >
              {groupedMessages.length === 0 ? (
                <ReadyToSendState selectedChat={selectedChat} />
              ) : (
                groupedMessages.map((msg) => (
                  <Fragment key={msg.id}>
                    {msg.dateLabel && (
                      <Box display="flex" justifyContent="center" my={1.5}>
                        <Typography
                          fontSize={11}
                          fontWeight={600}
                          color="text.secondary"
                          sx={{
                            px: 1.25,
                            py: 0.5,
                            borderRadius: "6px",
                            bgcolor: "#f0f2f5",
                            boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {msg.dateLabel}
                        </Typography>
                      </Box>
                    )}
                    <MessageRow
                      message={msg}
                      currentUser={currentUser}
                      mentionableUsers={
                        selectedChat.type === "channel" ? mentionableUsers : []
                      }
                      onEdit={handleEditMessage}
                      onForward={openForwardDialog}
                      onPin={handlePinMessage}
                      onReact={handleReaction}
                      onReply={handleReplyToMessage}
                      showAvatar={msg.showAvatar}
                      authorName={
                        selectedChat.type === "channel"
                          ? msg.authorName
                          : selectedChat.title
                      }
                    />
                  </Fragment>
                ))
              )}
            </Box>

            {/* ── Composer ── */}
            <Box px={2} pb={2} pt={1} bgcolor="#fff">
              {(replyToMessage || editingMessage) && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1}
                  sx={{
                    mb: 1,
                    px: 1.25,
                    py: 0.875,
                    borderLeft: `3px solid ${editingMessage ? "#f59e0b" : BRAND}`,
                    bgcolor: editingMessage ? "#fff7ed" : "#f8f5ff",
                    borderRadius: "6px",
                  }}
                >
                  <Box minWidth={0}>
                    <Typography
                      fontSize={12}
                      fontWeight={800}
                      color={editingMessage ? "#9a3412" : BRAND_TEXT}
                      noWrap
                    >
                      {editingMessage ? "Editing message" : "Replying"}
                    </Typography>
                    <Typography fontSize={12.5} color="text.secondary" noWrap>
                      {(editingMessage || replyToMessage)?.text || "Attachment"}
                    </Typography>
                  </Box>
                  <Tooltip title="Cancel">
                    <IconButton
                      size="small"
                      onClick={handleCancelComposerMode}
                      sx={{ width: 28, height: 28, borderRadius: "5px" }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Box
                sx={{
                  border: "0.5px solid",
                  borderColor: "divider",
                  borderRadius: "8px",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  "&:focus-within": {
                    borderColor: "#a78bfa",
                    boxShadow: "0 0 0 3px rgba(167,139,250,.1)",
                  },
                }}
              >
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={`Message ${selectedChat.title}…`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  error={Boolean(sendError)}
                  helperText={sendError || ""}
                  disabled={sending || uploading}
                  multiline
                  maxRows={5}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    px: 1.75,
                    pt: 1.25,
                    pb: 0.5,
                    "& .MuiInputBase-input": {
                      fontSize: 13.5,
                      lineHeight: 1.55,
                    },
                    "& .MuiFormHelperText-root": { mx: 0, mt: 0.5 },
                  }}
                />

                {pendingFiles.length > 0 && (
                  <Box
                    display="flex"
                    gap={0.75}
                    flexWrap="wrap"
                    px={1.25}
                    pb={1}
                  >
                    {pendingFiles.map((file, index) => (
                      <Chip
                        key={`${file.name}-${file.size}-${index}`}
                        icon={
                          <InsertDriveFileIcon
                            sx={{ fontSize: "16px !important" }}
                          />
                        }
                        label={file.name}
                        size="small"
                        onDelete={() => removePendingFile?.(index)}
                        sx={{
                          maxWidth: 260,
                          borderRadius: "6px",
                          bgcolor: BRAND_SOFT,
                          color: BRAND_TEXT,
                          "& .MuiChip-label": {
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Divider sx={{ opacity: 0.5 }} />

                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  px={1}
                  py={0.75}
                >
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    <input
                      type="file"
                      id="chat-file-upload"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    <ToolBtn
                      title="Attach file"
                      disabled={uploading || sending}
                      icon={
                        uploading ? (
                          <CircularProgress size={14} />
                        ) : (
                          <AttachFileIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      onClick={() =>
                        document.getElementById("chat-file-upload")?.click()
                      }
                    />
                    <ToolBtn
                      title="Emoji"
                      icon={<EmojiEmotionsIcon sx={{ fontSize: 16 }} />}
                      disabled={sending || uploading}
                      onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                    />
                    <ToolBtn
                      title="Mention"
                      disabled={sending || uploading}
                      icon={<AlternateEmailIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => setMentionAnchorEl(e.currentTarget)}
                    />

                    <Box
                      sx={{
                        width: "0.5px",
                        height: 16,
                        bgcolor: "divider",
                        mx: 0.5,
                      }}
                    />

                    <ToolBtn
                      title="Bold"
                      icon={<FormatBoldIcon sx={{ fontSize: 16 }} />}
                    />
                    <ToolBtn
                      title="Italic"
                      icon={<FormatItalicIcon sx={{ fontSize: 16 }} />}
                    />
                    <ToolBtn
                      title="Code"
                      icon={<CodeIcon sx={{ fontSize: 16 }} />}
                    />

                    {/* Mention picker popover */}
                    <Popover
                      open={mentionPickerOpen}
                      anchorEl={mentionAnchorEl}
                      onClose={() => setMentionAnchorEl(null)}
                      anchorOrigin={{ vertical: "top", horizontal: "left" }}
                      transformOrigin={{
                        vertical: "bottom",
                        horizontal: "left",
                      }}
                      PaperProps={{
                        sx: {
                          width: 264,
                          maxHeight: 300,
                          overflowY: "auto",
                          borderRadius: "10px",
                          border: "0.5px solid",
                          borderColor: "divider",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                          p: "4px",
                        },
                      }}
                    >
                      {mentionableUsers.map((user) => {
                        const userId = getBuddySendId(user);
                        const name = getBuddyName(user);
                        const email = getBuddyEmail(user);
                        return (
                          <Button
                            key={userId || email || name}
                            onClick={() => insertMention(user)}
                            sx={{
                              width: "100%",
                              justifyContent: "flex-start",
                              textTransform: "none",
                              px: 1.25,
                              py: 0.75,
                              borderRadius: "7px",
                              "&:hover": { bgcolor: BRAND_SOFT },
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 26,
                                height: 26,
                                mr: 1,
                                fontSize: 11,
                                fontWeight: 600,
                                borderRadius: "6px",
                                bgcolor: BRAND_SOFT,
                                color: BRAND_TEXT,
                              }}
                            >
                              {name.charAt(0)}
                            </Avatar>
                            <Box textAlign="left" minWidth={0}>
                              <Typography
                                fontSize={13}
                                fontWeight={500}
                                noWrap
                                color="text.primary"
                              >
                                {name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontSize={11}
                                noWrap
                              >
                                {email || userId}
                              </Typography>
                            </Box>
                          </Button>
                        );
                      })}
                    </Popover>

                    <Popover
                      open={emojiPickerOpen}
                      anchorEl={emojiAnchorEl}
                      onClose={() => setEmojiAnchorEl(null)}
                      anchorOrigin={{ vertical: "top", horizontal: "left" }}
                      transformOrigin={{
                        vertical: "bottom",
                        horizontal: "left",
                      }}
                      PaperProps={{
                        sx: {
                          width: 244,
                          borderRadius: "10px",
                          border: "0.5px solid",
                          borderColor: "divider",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                          p: 1,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: 0.5,
                        }}
                      >
                        {EMOJI_OPTIONS.map((emoji) => (
                          <IconButton
                            key={emoji}
                            size="small"
                            onClick={() => insertEmoji(emoji)}
                            sx={{
                              width: 38,
                              height: 34,
                              borderRadius: "7px",
                              fontSize: 20,
                              "&:hover": { bgcolor: BRAND_SOFT },
                            }}
                          >
                            {emoji}
                          </IconButton>
                        ))}
                      </Box>
                    </Popover>
                  </Stack>

                  <Button
                    variant="contained"
                    size="small"
                    endIcon={
                      sending ? (
                        <CircularProgress color="inherit" size={13} />
                      ) : (
                        <SendIcon sx={{ fontSize: "14px !important" }} />
                      )
                    }
                    onClick={handleSend}
                    disabled={sending || uploading || !canSend}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 13,
                      borderRadius: "6px",
                      px: 1.75,
                      py: 0.6,
                      bgcolor: BRAND,
                      boxShadow: "none",
                      "&:hover": { bgcolor: BRAND_DARK, boxShadow: "none" },
                      "&:active": { transform: "scale(0.97)" },
                      "&.Mui-disabled": { bgcolor: "#e5e5e5", color: "#aaa" },
                    }}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ flex: 1 }}>
            <EmptyChatState />
          </Box>
        )}
      </Box>
      <Dialog
        open={Boolean(forwardMessage)}
        onClose={closeForwardDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Forward to</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List dense sx={{ maxHeight: 360, overflow: "auto", py: 0.5 }}>
            {availableChats
              .filter((chat) => {
                const chatId =
                  chat.__conversationType === "channel"
                    ? getChannelId(chat)
                    : getBuddySendId(chat) ||
                      chat.directConversationId ||
                      chat.chat_id ||
                      chat.chatId;
                const selectedId =
                  selectedChat?.type === "channel"
                    ? selectedChat.id
                    : selectedChat?.id;
                return String(chatId || "") !== String(selectedId || "");
              })
              .map((chat) => {
                const isChannel = chat.__conversationType === "channel";
                const title = isChannel
                  ? getChannelName(chat)
                  : getBuddyName(chat);
                const subtitle = isChannel ? "Group" : getBuddyEmail(chat);
                const key = isChannel
                  ? getChannelId(chat)
                  : getBuddySendId(chat) || chat.directConversationId || title;

                return (
                  <ListItemButton key={key} onClick={() => forwardToChat(chat)}>
                    <Avatar
                      src={getImageUrl(chat)}
                      sx={{
                        width: 32,
                        height: 32,
                        mr: 1.25,
                        fontSize: 12,
                        bgcolor: isChannel ? BRAND_SOFT : "#e7f0ff",
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
          <Button onClick={closeForwardDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
