import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CallIcon from "@mui/icons-material/Call";
import CodeIcon from "@mui/icons-material/Code";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import {
  getAvailability,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getImageUrl,
  getPhoneNumber,
} from "./chatHelpers";
import PinglyMark from "./PinglyMark";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND = "#6F2DA8";
const BRAND_DARK = "#5d238f";
const BRAND_SOFT = "#ede9f8";
const BRAND_TEXT = "#4a1e72";
const SIDEBAR_BG = "#1a0a2e";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ selectedChat, setSelectedChat, chats = [] }) {
  const channels = chats.filter((c) => c.type === "channel");
  const dms = chats.filter((c) => c.type !== "channel");

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

      {/* DMs */}
      {dms.length > 0 && (
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
            Direct messages
          </Typography>
          {dms.map((chat) => (
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
        "&:hover": { bgcolor: active ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)" },
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

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChatState() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      textAlign="center"
      px={3}
      sx={{ bgcolor: "#fafafa" }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "14px",
          bgcolor: BRAND_SOFT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
        }}
      >
        <PinglyMark size={28} />
      </Box>
      <Typography fontWeight={600} fontSize={17} mb={0.75}>
        Welcome to Pingly
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        maxWidth={340}
        lineHeight={1.65}
        fontSize={13}
      >
        Choose a person or channel from the sidebar to start a conversation.
      </Typography>
    </Box>
  );
}

// ─── Ready-to-send placeholder ────────────────────────────────────────────────
function ReadyToSendState({ selectedChat }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100%"
    >
      <Box textAlign="center" maxWidth={340}>
        <Avatar
          src={selectedChat.imageUrl}
          sx={{
            mx: "auto",
            mb: 1.5,
            width: 56,
            height: 56,
            borderRadius: "14px",
            fontSize: 20,
            fontWeight: 600,
            bgcolor: selectedChat.type === "channel" ? BRAND_SOFT : "#e7f0ff",
            color: selectedChat.type === "channel" ? BRAND_TEXT : "#1a4fa0",
          }}
        >
          {selectedChat.type === "channel" ? (
            <GroupsIcon />
          ) : (
            selectedChat.title.charAt(0)
          )}
        </Avatar>
        <Typography fontWeight={600} fontSize={15} mb={0.75}>
          {selectedChat.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.65} fontSize={13}>
          This is the very beginning of your direct message history with{" "}
          {selectedChat.title}. Say hello!
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Reaction emoji list ──────────────────────────────────────────────────────
const REACTION_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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

const getGroupMemberSummary = (chat) => {
  const names = getGroupMembers(chat).map((member) => getBuddyName(member)).filter(Boolean);

  if (names.length === 0) return chat?.subtitle || "Group chat";
  if (names.length <= 4) return names.join(", ");
  return `${names.slice(0, 4).join(", ")} +${names.length - 4}`;
};

// ─── Message row (Slack-style) ────────────────────────────────────────────────
function MessageRow({ message, onReact, showAvatar = true, authorName }) {
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const isMe = message.direction === "outbound";

  const handleReact = (emoji) => {
    onReact(message.id, emoji);
    setPickerAnchor(null);
  };

  const avatarBg = isMe
    ? "#f0fdf4"
    : BRAND_SOFT;
  const avatarColor = isMe ? "#166534" : BRAND_TEXT;
  const initials = isMe ? "Me" : (authorName || "?").charAt(0);
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.25,
        px: 1,
        py: 0.625,
        borderRadius: "6px",
        position: "relative",
        "&:hover": { bgcolor: "action.hover" },
        "&:hover .msg-toolbar": { opacity: 1 },
        mt: showAvatar ? 0.75 : 0,
      }}
    >
      {/* Avatar column */}
      <Box sx={{ width: 34, flexShrink: 0 }}>
        {showAvatar ? (
          <Avatar
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              fontSize: 12,
              fontWeight: 600,
              bgcolor: avatarBg,
              color: avatarColor,
            }}
          >
            {initials}
          </Avatar>
        ) : null}
      </Box>

      {/* Content */}
      <Box flex={1} minWidth={0}>
        {showAvatar && (
          <Box display="flex" alignItems="baseline" gap={0.875} mb={0.375}>
            <Typography fontSize={13.5} fontWeight={600} color="text.primary">
              {isMe ? "You" : authorName}
            </Typography>
            <Typography fontSize={11} color="text.disabled">
              {message.timestamp || ""}
            </Typography>
          </Box>
        )}

        <Typography
          fontSize={13.5}
          color="text.primary"
          lineHeight={1.55}
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {message.text}
        </Typography>

        {message.attachments?.length > 0 && (
          <Stack spacing={0.75} mt={message.text ? 0.75 : 0}>
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
                        <Typography component="span" fontSize={13} fontWeight={600} noWrap>
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
                onClick={() => handleReact(r.emoji)}
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

      {/* Hover toolbar */}
      <Box
        className="msg-toolbar"
        sx={{
          position: "absolute",
          top: -14,
          right: 8,
          opacity: 0,
          transition: "opacity 0.12s",
          display: "flex",
          gap: 0.25,
          bgcolor: "background.paper",
          border: "0.5px solid",
          borderColor: "divider",
          borderRadius: "7px",
          p: 0.375,
        }}
      >
        {REACTION_OPTIONS.slice(0, 3).map((emoji) => (
          <Box
            key={emoji}
            onClick={() => handleReact(emoji)}
            sx={{
              width: 26,
              height: 26,
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              cursor: "pointer",
              "&:hover": { bgcolor: BRAND_SOFT },
            }}
          >
            {emoji}
          </Box>
        ))}
        <Tooltip title="More reactions">
          <IconButton
            size="small"
            onClick={(e) => setPickerAnchor(e.currentTarget)}
            sx={{ width: 26, height: 26, borderRadius: "5px", fontSize: 14 }}
          >
            <EmojiEmotionsIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Full reaction picker */}
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
    </Box>
  );
}

// ─── Toolbar icon button ──────────────────────────────────────────────────────
function ToolBtn({ title, icon, disabled, onClick }) {
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

// ─── Main ChatWindow ──────────────────────────────────────────────────────────
export default function ChatWindow({
  chatBoxRef,
  chats,
  currentMessages,
  handleFileUpload,
  handleReaction,
  handleSend,
  inputValue,
  mentionableUsers = [],
  pendingFiles = [],
  removePendingFile,
  selectedChat,
  sendError,
  sending,
  onOpenAddMembers,
  setInputValue,
  setSelectedChat,
  uploading,
}) {
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const availability = selectedChat ? getAvailability(selectedChat.raw) : null;
  const phone = selectedChat ? getPhoneNumber(selectedChat.raw) : "";
  const groupMembers = selectedChat?.type === "channel" ? getGroupMembers(selectedChat) : [];
  const mentionPickerOpen = Boolean(mentionAnchorEl);
  const canSend = Boolean(inputValue.trim()) || pendingFiles.length > 0;

  const insertMention = (user) => {
    const name = getBuddyName(user);
    const spacer = inputValue && !inputValue.endsWith(" ") ? " " : "";
    setInputValue(`${inputValue}${spacer}@${name} `);
    setMentionAnchorEl(null);
  };

  // Group consecutive messages from the same author for Slack-style threading
  const groupedMessages = currentMessages.map((msg, i) => {
    const prev = currentMessages[i - 1];
    const showAvatar =
      !prev ||
      prev.direction !== msg.direction ||
      prev.authorId !== msg.authorId;
    return { ...msg, showAvatar };
  });

  return (
    <Box
      className={selectedChat ? "d-flex" : "d-none d-md-flex"}
      sx={{ minHeight: 0 }}
    >
      {/* Sidebar */}
      <Sidebar
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        chats={chats}
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
                <Typography fontWeight={600} fontSize={14} color="text.primary">
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
                  <Typography variant="caption" color="text.secondary" fontSize={11}>
                    {selectedChat.type === "channel"
                      ? getGroupMemberSummary(selectedChat)
                      : `${availability?.label || "Unknown"} · ${selectedChat.subtitle}`}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ToolBtn title="Search" icon={<SearchIcon sx={{ fontSize: 16 }} />} />
              {selectedChat.type === "channel" && (
                <ToolBtn
                  title="Add people"
                  icon={<GroupAddIcon sx={{ fontSize: 17 }} />}
                  onClick={onOpenAddMembers}
                />
              )}
              {selectedChat.type !== "channel" && (
                <>
                  <ToolBtn
                    title={phone ? "Audio call" : "No phone number"}
                    icon={<CallIcon sx={{ fontSize: 16 }} />}
                    disabled={!phone}
                    onClick={() => phone && window.open(`tel:${phone}`, "_self")}
                  />
                  <ToolBtn
                    title="Video call"
                    icon={<VideoCallIcon sx={{ fontSize: 17 }} />}
                    disabled
                  />
                </>
              )}
              <Box
                sx={{
                  width: 0.5,
                  height: 18,
                  bgcolor: "divider",
                  mx: 0.5,
                }}
              />
              <ToolBtn title="More" icon={<MoreHorizIcon sx={{ fontSize: 17 }} />} />
            </Stack>
          </Box>

          {/* ── Messages ── */}
          {selectedChat.type === "channel" && groupMembers.length > 0 && (
            <Box
              px={2.5}
              py={0.75}
              display="flex"
              alignItems="center"
              gap={0.75}
              borderBottom="0.5px solid"
              sx={{ borderColor: "divider", overflowX: "auto" }}
            >
              {groupMembers.slice(0, 12).map((member) => (
                <Chip
                  key={getBuddySendId(member) || getBuddyEmail(member) || getBuddyName(member)}
                  avatar={
                    <Avatar src={getImageUrl(member)}>
                      {getBuddyName(member).charAt(0)}
                    </Avatar>
                  }
                  label={getBuddyName(member)}
                  size="small"
                  sx={{
                    maxWidth: 150,
                    borderRadius: "6px",
                    bgcolor: "#f8fafc",
                    "& .MuiChip-label": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                />
              ))}
            </Box>
          )}

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
            <Box display="flex" justifyContent="center" mb={2}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  width: "100%",
                }}
              >
                <Box
                  sx={{ flex: 1, height: "0.5px", bgcolor: "divider" }}
                />
                <Typography
                  fontSize={11}
                  fontWeight={500}
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Today
                </Typography>
                <Box
                  sx={{ flex: 1, height: "0.5px", bgcolor: "divider" }}
                />
              </Box>
            </Box>

            {groupedMessages.length === 0 ? (
              <ReadyToSendState selectedChat={selectedChat} />
            ) : (
              groupedMessages.map((msg) => (
                <MessageRow
                  key={msg.id}
                  message={msg}
                  onReact={handleReaction}
                  showAvatar={msg.showAvatar}
                  authorName={selectedChat.title}
                />
              ))
            )}
          </Box>

          {/* ── Composer ── */}
          <Box px={2} pb={2} pt={1} bgcolor="#fff">
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
                      icon={<InsertDriveFileIcon sx={{ fontSize: "16px !important" }} />}
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
                  />
                  <ToolBtn
                    title="Mention"
                    disabled={sending || uploading}
                    icon={<AlternateEmailIcon sx={{ fontSize: 16 }} />}
                    onClick={(e) => setMentionAnchorEl(e.currentTarget)}
                  />

                  <Box sx={{ width: "0.5px", height: 16, bgcolor: "divider", mx: 0.5 }} />

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
                    transformOrigin={{ vertical: "bottom", horizontal: "left" }}
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
  );
}
