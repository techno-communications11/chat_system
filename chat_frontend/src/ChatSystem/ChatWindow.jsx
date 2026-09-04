import { Fragment, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Checkbox,
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
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import CallIcon from "@mui/icons-material/Call";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import BlockIcon from "@mui/icons-material/Block";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { REACTION_OPTIONS } from "../utils/constants.js";
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
import InternalCallPanel from "./calls/InternalCallPanel";
import EmojiPicker from "./chatWindow/EmojiPicker";
import MessageActions from "./chatWindow/MessageActions";
import MessageRowComponent from "./chatWindow/MessageRow";
import SidebarItem from "./chatWindow/SidebarItem";
import ConversationMediaDialog from "./chatWindow/ConversationMediaDialog";
import ScheduleCallDialog from "./calls/ScheduleCallDialog";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND = "#6750E8";
const BRAND_DARK = "#4F39C6";
const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";
const SIDEBAR_BG = "#19152f";

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

/* Legacy sidebar item moved to chatWindow/SidebarItem.jsx.
function LegacySidebarItem({ chat, active, onClick }) {
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
*/





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
function MessageRowLegacy({
  message,
  currentUser,
  mentionableUsers = [],
  onEdit,
  onForward,
  onPin,
  onDelete,
  onCopy,
  onSelect,
  selected = false,
  selectionMode = false,
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
  const messageAge = Date.now() - new Date(message.sentAt).getTime();
  const canEdit = isMe && Number.isFinite(messageAge) && messageAge >= 0 && messageAge <= 10 * 60 * 1000;

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

  const replyToMessage = () => { onReply?.(message); closeActions(); };
  const editMessage = () => { onEdit?.(message); closeActions(); };
  const forwardMessage = () => { onForward?.(message); closeActions(); };
  const pinMessage = () => { onPin?.(message); closeActions(); };
  const selectMessage = () => { onSelect?.(message); closeActions(); };
  const deleteMessage = () => { onDelete?.([message]); closeActions(); };
  const copyMessage = () => { onCopy?.(message); closeActions(); };

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
        bgcolor: selected ? "action.selected" : "transparent",
        "&:hover": { bgcolor: selected ? "action.selected" : "transparent" },
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
            px: 1.5,
            py: 1,
            borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            bgcolor: (theme) => isMe
              ? theme.palette.mode === "dark" ? "#4d4698" : "#7469e8"
              : theme.palette.mode === "dark" ? "#20263b" : "#eef0fb",
            color: isMe ? "#fff" : "text.primary",
            border: isMe ? "none" : "1px solid",
            borderColor: isMe ? "transparent" : "#e3e5f0",
            boxShadow: isMe ? "0 8px 18px rgba(103,80,232,.18)" : "0 4px 12px rgba(35,42,70,.045)",
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
            color={isMe ? "#ffffff" : "text.primary"}
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
            <Typography component="span" fontSize={10} color={isMe ? "rgba(255,255,255,.78)" : "text.secondary"}>
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
                    bgcolor: "background.paper",
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
            bgcolor: r.reacted ? "var(--chat-soft)" : "background.paper",
                  fontSize: 12,
                  color: r.reacted ? "#6d28d9" : "text.secondary",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  "&:hover": {
                    borderColor: "#a78bfa",
                    bgcolor: "var(--chat-soft)",
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

      <MessageActions
        anchorEl={actionAnchorEl}
        canEdit={canEdit}
        isMe={isMe}
        message={message}
        onClose={closeActions}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        onForward={onForward}
        onOpenPicker={(anchor) => setPickerAnchor(anchor)}
        onPin={onPin}
        onReact={(emoji) => handleReact(emoji)}
        onReply={onReply}
        onSelect={onSelect}
        selected={selected}
        selectionMode={selectionMode}
      />
      <Popover
        open={false}
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
          <ListItemButton onClick={copyMessage} sx={{ gap: 1.25, py: 1 }}>
            <ContentCopyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText primary="Copy" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }} />
          </ListItemButton>
          {isMe && (
            <ListItemButton onClick={selectMessage} sx={{ gap: 1.25, py: 1 }}>
              <Checkbox checked={selectionMode || selected} tabIndex={-1} disableRipple />
              <ListItemText primary="Select" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }} />
            </ListItemButton>
          )}
          <ListItemButton onClick={replyToMessage} sx={{ gap: 1.25, py: 1 }}>
            <ReplyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Reply"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
          {canEdit && (
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
          {isMe && (
            <ListItemButton onClick={deleteMessage} sx={{ gap: 1.25, py: 1 }}>
              <DeleteOutlineIcon sx={{ fontSize: 18, color: "error.main" }} />
              <ListItemText primary="Delete" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: "error.main" }} />
            </ListItemButton>
          )}
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
void MessageRowLegacy;

export default function ChatWindow({
  activeCall,
  availableChats = [],
  callStarting = false,
  chatBoxRef,
  chats,
  currentUser,
  callSocketRef,
  currentMessages,
  messageInfoVersions = {},
  hasOlderMessages = false,
  loadingOlderMessages = false,
  editingMessage,
  enterToSend = false,
  handleFileUpload,
  handleCancelComposerMode,
  handleEditMessage,
  handleForwardMessage,
  handlePinMessage,
  handleDeleteMessages,
  handleBlockUser,
  blockedUserIds = [],
  handleCopyMessage,
  handleReaction,
  handleReplyToMessage,
  handleSend,
  onEndActiveCall,
  onLeaveGroup,
  onTransferOwnership,
  onRemoveGroupMember,
  onLoadOlderMessages,
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
  onClearChat,
  onTyping,
  typingUser,
  setInputValue,
  setSelectedChat,
  uploading,
}) {
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [messageSearchError, setMessageSearchError] = useState("");
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [groupMenuAnchorEl, setGroupMenuAnchorEl] = useState(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [scheduleCallDialogOpen, setScheduleCallDialogOpen] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const composerInputRef = useRef(null);
  const availability = selectedChat ? getAvailability(selectedChat.raw) : null;
  const groupMembers =
    selectedChat?.type === "channel" ? getGroupMembers(selectedChat) : [];
  const groupMenuOpen = Boolean(groupMenuAnchorEl);
  const isGroupMuted = Boolean(selectedChat && mutedGroupIds.includes(String(selectedChat.id)));
  const mentionPickerOpen = Boolean(mentionAnchorEl);
  const mentionCandidates = mentionableUsers.filter((user) => {
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return true;
    return [getBuddyName(user), getBuddyEmail(user)]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  const applyTextFormat = (marker) => {
    const input = composerInputRef.current;
    const value = String(inputValue || "");
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const selectedText = value.slice(start, end);
    const nextValue = `${value.slice(0, start)}${marker}${selectedText}${marker}${value.slice(end)}`;
    setInputValue(nextValue);

    requestAnimationFrame(() => {
      input?.focus();
      const cursorStart = start + marker.length;
      const cursorEnd = cursorStart + selectedText.length;
      input?.setSelectionRange(cursorStart, cursorEnd);
    });
  };
  const canSend = Boolean(inputValue.trim()) || pendingFiles.length > 0;
  const pinnedMessages = currentMessages.filter(
    (message) => message.metadata?.pinned,
  );
  const latestPinnedMessage = pinnedMessages[pinnedMessages.length - 1] || null;
  const directContactMessage = currentMessages.find((message) => message.direction !== "outbound") || {
    authorId: selectedChat?.id,
  };
  const directContactId = String(directContactMessage.authorId || "");
  const selectionMode = selectedMessageIds.length > 0;
  const selectedMessages = currentMessages.filter((message) =>
    selectedMessageIds.includes(String(message.id)),
  );

  const toggleMessageSelection = (message) => {
    if (message?.direction !== "outbound") return;
    const messageId = String(message.id);
    setSelectedMessageIds((prev) => prev.includes(messageId)
      ? prev.filter((id) => id !== messageId)
      : [...prev, messageId]);
  };

  const clearMessageSelection = () => setSelectedMessageIds([]);

  const deleteSelectedMessages = async () => {
    const deleted = await handleDeleteMessages?.(selectedMessages);
    if (deleted) clearMessageSelection();
  };

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
    setInputValue((currentValue) =>
      currentValue.replace(/(?:^|\s)@[^\s@]*$/, (match) => {
        const prefix = match.startsWith(" ") ? " " : "";
        return `${prefix}@${name} `;
      }),
    );
    setMentionQuery("");
    setMentionAnchorEl(null);
  };

  const insertEmoji = (emoji) => {
    setInputValue(`${inputValue}${emoji}`);
  };

  const closeEmojiPicker = () => {
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
        sx={{ width: "100%", minWidth: 0, minHeight: 0, overflow: "hidden" }}
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
               width: 0,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              bgcolor: "var(--chat-canvas)",
              backgroundImage: "radial-gradient(circle at 82% 8%, rgba(117,104,235,.07), transparent 28%), linear-gradient(180deg, rgba(255,255,255,.3), transparent 75%)",
            }}
          >
            {/* ── Header ── */}
            <Box
              px={{ xs: 1.25, sm: 2.5 }}
              py={1.25}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              bgcolor="background.paper"
              borderBottom="0"
              sx={{ boxShadow: "0 4px 18px rgba(0,0,0,.08)", zIndex: 1 }}
            >
              <Box
                display="flex"
                alignItems="center"
                gap={1.25}
                sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}
              >
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

                 <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                  <Typography
                    fontWeight={750}
                    fontSize={16}
                    color="text.primary"
                    noWrap
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
                      fontSize={12}
                      noWrap
                    >
                      {selectedChat.type === "channel"
                        ? getGroupMemberSummary(selectedChat, currentUser)
                        : `${availability?.label || "Unknown"} · ${selectedChat.subtitle}`}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Stack
                direction="row"
                alignItems="center"
                spacing={{ xs: 0.15, sm: 0.5 }}
                sx={{
                  position: "relative",
                  flexShrink: 0,
                  width: { xs: "auto", sm: "auto" },
                  maxWidth: "100%",
                  overflow: "visible",
                }}
              >
                <Box sx={{ width: 34, flexShrink: 0 }} />
                <Box
                  sx={{
                    position: "absolute",
                    left: messageSearchOpen ? "auto" : 0,
                    right: messageSearchOpen ? 0 : "auto",
                    top: "50%",
                    zIndex: 2,
                    height: 34,
                    transform: "translateY(-50%)",
                    width: messageSearchOpen ? "min(280px, calc(100vw - 16px))" : 34,
                    maxWidth: "calc(100vw - 16px)",
                    minWidth: 34,
                    overflow: "hidden",
                    transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
                    willChange: "width",
                  }}
                >
                  {messageSearchOpen ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        bgcolor: "var(--chat-soft)",
                        border: "1px solid",
                        borderColor: "primary.main",
                        borderRadius: 2,
                        px: 1,
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 17, color: "text.secondary", mr: 0.5 }} />
                      <TextField
                        autoFocus
                        fullWidth
                        variant="standard"
                        placeholder="Search messages"
                        value={messageSearchTerm}
                        onChange={(event) => setMessageSearchTerm(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") runMessageSearch();
                          if (event.key === "Escape") setMessageSearchOpen(false);
                        }}
                        InputProps={{ disableUnderline: true }}
                        sx={{ "& input": { py: 0.75, fontSize: 13 } }}
                      />
                      <IconButton
                        size="small"
                        aria-label="Close message search"
                        onClick={() => setMessageSearchOpen(false)}
                      >
                        <CloseIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <ToolBtn
                      title="Search messages"
                      icon={<SearchIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setMessageSearchOpen(true)}
                    />
                  )}
                </Box>
                {selectedChat.type === "channel" && (
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    <ToolBtn
                      title="Add people"
                      icon={<GroupAddIcon sx={{ fontSize: 17 }} />}
                      onClick={onOpenAddMembers}
                    />
                  </Box>
                )}
                <ToolBtn
                  title="Voice call"
                  icon={callStarting ? <CircularProgress size={14} /> : <CallIcon sx={{ fontSize: 17 }} />}
                  disabled={callStarting}
                  onClick={() => onStartConversationCall?.("audio")}
                />
                <ToolBtn
                  title="Video call"
                  icon={callStarting ? <CircularProgress size={14} /> : <VideoCallIcon sx={{ fontSize: 17 }} />}
                  disabled={callStarting}
                  onClick={() => onStartConversationCall?.("video")}
                />
                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                  <ToolBtn
                    title="Schedule call"
                    icon={<CalendarMonthIcon sx={{ fontSize: 17 }} />}
                    onClick={() => setScheduleCallDialogOpen(true)}
                  />
                </Box>
                <Box
                  sx={{
                    display: { xs: "none", sm: "block" },
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
            {selectionMode && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
                sx={{ px: 2, py: 0.75, bgcolor: "action.selected", borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {selectedMessageIds.length} selected
                </Typography>
                <Box display="flex" gap={0.5}>
                  <Button size="small" onClick={clearMessageSelection} sx={{ textTransform: "none" }}>
                    Cancel
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={deleteSelectedMessages} sx={{ textTransform: "none", fontWeight: 700 }}>
                    Delete
                  </Button>
                </Box>
              </Box>
            )}
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
              onTransferOwnership={onTransferOwnership}
              onRemoveMember={onRemoveGroupMember}
              isGroupAdmin={groupMembers.some((member) =>
                isSamePerson(member, currentUser) &&
                ["owner", "admin"].includes(String(member.conversationRole || "").toLowerCase())
              )}
              onOpenInfo={openGroupInfo}
              onOpenMedia={() => { setMediaDialogOpen(true); closeGroupMenu(); }}
              onClearChat={() => { onClearChat?.(); closeGroupMenu(); }}
              onOpenLeaveConfirm={openLeaveConfirm}
              onToggleMute={toggleGroupMute}
              open={groupMenuOpen}
              selectedChat={selectedChat}
            />
            {selectedChat.type !== "channel" && (
              <Popover
                open={groupMenuOpen}
                anchorEl={groupMenuAnchorEl}
                onClose={closeGroupMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{ sx: { minWidth: 190, borderRadius: 2 } }}
              >
                <List dense disablePadding>
                  <ListItemButton
                    onClick={() => { setMediaDialogOpen(true); closeGroupMenu(); }}
                    sx={{ gap: 1.25, py: 1 }}
                  >
                    <AttachFileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <ListItemText primary="Media, links & files" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
                  </ListItemButton>
                  <ListItemButton onClick={() => { onClearChat?.(); closeGroupMenu(); }} sx={{ gap: 1.25, py: 1 }}>
                    <DeleteSweepIcon sx={{ fontSize: 18, color: "error.main" }} />
                    <ListItemText primary="Clear chat" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: "error.main" }} />
                  </ListItemButton>
                  <ListItemButton
                    onClick={() => {
                      onToggleGroupMute?.(selectedChat.id);
                      closeGroupMenu();
                    }}
                    sx={{ gap: 1.25, py: 1 }}
                  >
                    {isGroupMuted ? <NotificationsActiveIcon sx={{ fontSize: 18 }} /> : <NotificationsOffIcon sx={{ fontSize: 18 }} />}
                    <ListItemText
                      primary={isGroupMuted ? "Unmute notifications" : "Mute notifications"}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
                    />
                  </ListItemButton>
                  <ListItemButton
                    onClick={() => {
                      handleBlockUser?.(directContactMessage);
                      closeGroupMenu();
                    }}
                    disabled={!directContactId}
                    sx={{ gap: 1.25, py: 1 }}
                  >
                    <BlockIcon sx={{ fontSize: 18, color: "error.main" }} />
                    <ListItemText
                      primary={blockedUserIds.includes(directContactId) ? "Unblock user" : "Block user"}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: "error.main" }}
                    />
                  </ListItemButton>
                </List>
              </Popover>
            )}

            <InternalCallPanel
              activeCall={activeCall}
              currentUser={currentUser}
              onEnd={onEndActiveCall}
              socketRef={callSocketRef}
            />
            <PinnedMessageBanner
              latestPinnedMessage={latestPinnedMessage}
              pinnedCount={pinnedMessages.length}
            />

            {messageSearchOpen && (
              <Box
                sx={{
                  px: { xs: 1, sm: 2 },
                  py: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
              {messageSearchLoading && (
                <CircularProgress size={16} sx={{ display: "block", mb: 0.5 }} />
              )}
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
              </Box>
            )}

            <Box
              ref={chatBoxRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                overflowX: "hidden",
                px: { xs: 0.5, sm: 1.5 },
                py: { xs: 1, sm: 2 },
                bgcolor: "background.paper",
              }}
            >
              {hasOlderMessages && (
                <Box
                  display="flex"
                  justifyContent="center"
                  mb={1}
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    py: 0.5,
                    bgcolor: "background.paper",
                  }}
                >
                  <Tooltip title={loadingOlderMessages ? "Loading previous messages" : "Load previous messages"}>
                    <span>
                  <IconButton
                    size="small"
                    onClick={onLoadOlderMessages}
                    disabled={loadingOlderMessages}
                    aria-label="Load previous messages"
                  >
                    {loadingOlderMessages ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                  </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              )}
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
                            bgcolor: "action.hover",
                            boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {msg.dateLabel}
                        </Typography>
                      </Box>
                    )}
                    <MessageRowComponent
                      message={msg}
                      chatId={selectedChat.chatId || selectedChat.id}
                      messageInfoVersion={messageInfoVersions[selectedChat.chatId || selectedChat.id] || 0}
                      currentUser={currentUser}
                      mentionableUsers={
                        selectedChat.type === "channel" ? mentionableUsers : []
                      }
                      onEdit={handleEditMessage}
                      onForward={openForwardDialog}
                      onPin={handlePinMessage}
                      onDelete={handleDeleteMessages}
                      onCopy={handleCopyMessage}
                      onSelect={toggleMessageSelection}
                      selected={selectedMessageIds.includes(String(msg.id))}
                      selectionMode={selectionMode}
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

            <ConversationMediaDialog
              open={mediaDialogOpen}
              onClose={() => setMediaDialogOpen(false)}
              messages={currentMessages}
            />

            {/* ── Composer ── */}
            <Box px={{ xs: 1, sm: 2 }} pb={{ xs: 1, sm: 2 }} pt={1} bgcolor="background.paper">
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
                    bgcolor: editingMessage ? "#fff7ed" : "var(--chat-soft)",
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
                  inputRef={composerInputRef}
                  fullWidth
                  variant="standard"
                  placeholder={`Message ${selectedChat.title}…`}
                  value={inputValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setInputValue(value);
                    onTyping?.(Boolean(value.trim()));
                    const cursor = event.target.selectionStart ?? value.length;
                    const textBeforeCursor = value.slice(0, cursor);
                    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
                    const canMention = selectedChat?.type === "channel" && mentionableUsers.length > 0;

                    if (mentionMatch && canMention) {
                      setMentionQuery(mentionMatch[1]);
                      setMentionAnchorEl(event.currentTarget);
                    } else {
                      setMentionQuery("");
                      setMentionAnchorEl(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) onTyping?.(false);
                    if (enterToSend && event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
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
                {typingUser?.name && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1.75 }}>
                    {typingUser.name} is typing…
                  </Typography>
                )}

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
                    <Box
                      sx={{
                        width: "0.5px",
                        height: 16,
                        bgcolor: "divider",
                        mx: 0.5,
                      }}
                    />

                    <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.25 }}>
                      <ToolBtn
                        title="Bold"
                        icon={<FormatBoldIcon sx={{ fontSize: 16 }} />}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => applyTextFormat("**")}
                      />
                      <ToolBtn
                        title="Italic"
                        icon={<FormatItalicIcon sx={{ fontSize: 16 }} />}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => applyTextFormat("*")}
                      />
                    </Box>
                    {/* Mention picker popover */}
                    <Popover
                      open={mentionPickerOpen}
                      anchorEl={mentionAnchorEl}
                      onClose={() => {
                        setMentionAnchorEl(null);
                        setMentionQuery("");
                      }}
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
                      {mentionCandidates.map((user) => {
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

                    <EmojiPicker
                      anchorEl={emojiAnchorEl}
                      onClose={closeEmojiPicker}
                      onSelect={insertEmoji}
                    />
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
      <ScheduleCallDialog
        open={scheduleCallDialogOpen}
        onClose={() => setScheduleCallDialogOpen(false)}
        selectedChat={selectedChat}
        currentUser={currentUser}
      />
    </>
  );
}
