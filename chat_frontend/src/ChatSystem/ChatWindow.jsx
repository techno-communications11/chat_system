import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
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
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import GroupsIcon from "@mui/icons-material/Groups";
import SendIcon from "@mui/icons-material/Send";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import {
  getAvailability,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getPhoneNumber,
} from "./chatHelpers";
import PinglyMark from "./PinglyMark";

const reactionOptions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function EmptyChatState() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100%"
      textAlign="center"
      px={2}
      sx={{
        bgcolor: "#f7f8fa",
      }}
    >
      <Box maxWidth={460}>
        <Box display="flex" justifyContent="center" mb={1.5}>
          <PinglyMark size={58} />
        </Box>
        <Typography variant="h5" fontWeight={900}>
          Welcome to Pingly
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          Choose a person, group, or channel, share files, or start a call from
          the controls around your workspace.
        </Typography>
      </Box>
    </Box>
  );
}

function ReadyToSendState({ selectedChat }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100%">
      <Paper
        variant="outlined"
        sx={{
          maxWidth: 420,
          p: 2.5,
          borderRadius: 1.5,
          bgcolor: "#ffffff",
          textAlign: "center",
        }}
      >
        <Avatar
          src={selectedChat.imageUrl}
          sx={{
            mx: "auto",
            mb: 1.5,
            bgcolor: selectedChat.type === "channel" ? "#f0e8f7" : "#e7f0ff",
            color: selectedChat.type === "channel" ? "#6F2DA8" : "#215db0",
          }}
        >
          {selectedChat.type === "channel" ? (
            <GroupsIcon />
          ) : (
            selectedChat.title.charAt(0)
          )}
        </Avatar>
        <Typography fontWeight={900} gutterBottom>
          {selectedChat.title}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Send a message, attach files, or use the header controls to start a
          call. Messages are stored in your local chat history.
        </Typography>
      </Paper>
    </Box>
  );
}

function MessageBubble({ message, onReact }) {
  const [reactionAnchorEl, setReactionAnchorEl] = useState(null);
  const inbound = message.direction === "inbound";
  const reactionPickerOpen = Boolean(reactionAnchorEl);

  const handleReactionClick = (emoji) => {
    onReact(message.id, emoji);
    setReactionAnchorEl(null);
  };

  return (
    <Box display="flex" justifyContent={inbound ? "flex-start" : "flex-end"} mb={1.5}>
      <Paper
        elevation={0}
        sx={{
          px: 1.75,
          py: 1.25,
          maxWidth: { xs: "88%", md: "62%" },
          borderRadius: 1.5,
          borderTopRightRadius: inbound ? 1.5 : 0.5,
          borderTopLeftRadius: inbound ? 0.5 : 1.5,
          bgcolor: inbound ? "#ffffff" : "#6F2DA8",
          color: inbound ? "#1f2937" : "white",
          border: inbound ? "1px solid #e5e7eb" : "none",
          boxShadow: inbound
            ? "0 4px 12px rgba(31,41,55,0.06)"
            : "0 4px 12px rgba(111,45,168,0.14)",
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {message.text}
        </Typography>
        {message.mentions?.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {message.mentions.map((mention) => (
              <Chip
                key={mention.userId || mention.email || mention.displayName}
                label={`@${mention.displayName || mention.email || mention.userId}`}
                size="small"
                sx={{
                  height: 23,
                  bgcolor: inbound ? "#edf5ff" : "rgba(255,255,255,0.18)",
                  color: inbound ? "#215db0" : "#ffffff",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            ))}
          </Stack>
        )}
        {message.reactions?.length > 0 && (
          <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1 }}
          >
            {message.reactions.map((reaction) => (
              <Chip
                key={reaction.emoji}
                label={`${reaction.emoji} ${reaction.count || 1}`}
                size="small"
                variant={reaction.reacted ? "filled" : "outlined"}
                onClick={() => handleReactionClick(reaction.emoji)}
                sx={{
                  height: 24,
                  bgcolor: reaction.reacted
                    ? inbound
                      ? "#f2e9f8"
                      : "rgba(255,255,255,0.2)"
                    : "transparent",
                  color: inbound ? "inherit" : "#ffffff",
                  borderColor: inbound ? "#e5e7eb" : "rgba(255,255,255,0.4)",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            ))}
          </Stack>
        )}
        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.75}>
          <Tooltip title="React">
            <IconButton
              size="small"
              onClick={(event) => setReactionAnchorEl(event.currentTarget)}
              sx={{
                p: 0.25,
                color: inbound ? "#6b7280" : "rgba(255,255,255,0.84)",
              }}
            >
              <EmojiEmotionsIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.78 }}>
            {new Date(message.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
          <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.78 }}>
            {inbound ? "received" : "sent"}
          </Typography>
        </Box>
        <Popover
          open={reactionPickerOpen}
          anchorEl={reactionAnchorEl}
          onClose={() => setReactionAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: inbound ? "right" : "left" }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: inbound ? "left" : "right",
          }}
          PaperProps={{
            sx: {
              p: 0.5,
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
            },
          }}
        >
          <Stack direction="row" spacing={0.25}>
            {reactionOptions.map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => handleReactionClick(emoji)}
                sx={{ fontSize: 20 }}
              >
                {emoji}
              </IconButton>
            ))}
          </Stack>
        </Popover>
      </Paper>
    </Box>
  );
}

export default function ChatWindow({
  chatBoxRef,
  currentMessages,
  handleFileUpload,
  handleReaction,
  handleSend,
  inputValue,
  mentionableUsers = [],
  selectedChat,
  sendError,
  connectUrl,
  sending,
  setInputValue,
  setSelectedChat,
  uploading,
}) {
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const availability = selectedChat ? getAvailability(selectedChat.raw) : null;
  const phone = selectedChat ? getPhoneNumber(selectedChat.raw) : "";
  const callTitle = phone ? "Audio call" : "No phone number";
  const mentionPickerOpen = Boolean(mentionAnchorEl);
  const insertMention = (user) => {
    const name = getBuddyName(user);
    const spacer = inputValue && !inputValue.endsWith(" ") ? " " : "";
    setInputValue(`${inputValue}${spacer}@${name} `);
    setMentionAnchorEl(null);
  };

  return (
    <Box
      className={selectedChat ? "d-flex" : "d-none d-md-flex"}
      sx={{ minHeight: 0, bgcolor: "#f7f8fa" }}
    >
      {selectedChat ? (
        <>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Box
              px={{ xs: 1.5, md: 2 }}
              py={1}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              bgcolor="#ffffff"
              borderBottom="1px solid #edf0f4"
            >
              <Box display="flex" alignItems="center" minWidth={0} gap={1.5}>
                <IconButton
                  sx={{ display: { md: "none", xs: "inline-flex" } }}
                  onClick={() => setSelectedChat(null)}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Avatar
                  src={selectedChat.imageUrl}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor:
                      selectedChat.type === "channel" ? "#f0e8f7" : "#e7f0ff",
                    color:
                      selectedChat.type === "channel" ? "#6F2DA8" : "#215db0",
                  }}
                >
                  {selectedChat.type === "channel" ? (
                    <GroupsIcon />
                  ) : (
                    selectedChat.title.charAt(0)
                  )}
                </Avatar>
                <Box minWidth={0}>
                  <Typography fontWeight={800} noWrap>
                    {selectedChat.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    {selectedChat.type !== "channel" && availability && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: availability.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {selectedChat.type === "channel"
                        ? selectedChat.subtitle
                        : `${availability?.label || "Unknown"} - ${
                            selectedChat.subtitle
                          }`}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                {selectedChat.type !== "channel" && (
                  <>
                    <Tooltip title={callTitle}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          phone ? window.open(`tel:${phone}`, "_self") : null
                        }
                        disabled={!phone}
                      >
                        <CallIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Video call">
                      <IconButton
                        size="small"
                        disabled
                      >
                        <VideoCallIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                <Chip
                  label={selectedChat.type === "channel" ? "Group" : "Direct"}
                  size="small"
                  color={
                    selectedChat.type === "channel" ? "secondary" : "primary"
                  }
                  variant="outlined"
                  sx={{ fontWeight: 700, display: { xs: "none", sm: "inline-flex" } }}
                />
              </Stack>
            </Box>

            <Box
              ref={chatBoxRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                px: { xs: 1.25, md: 3 },
                py: 2,
                bgcolor: "#f7f8fa",
              }}
            >
              <Box display="flex" justifyContent="center" mb={2}>
                <Chip label="Today" size="small" variant="outlined" />
              </Box>
              {currentMessages.length === 0 ? (
                <ReadyToSendState selectedChat={selectedChat} />
              ) : (
                currentMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onReact={handleReaction}
                  />
                ))
              )}
            </Box>

            <Box p={{ xs: 1, md: 1.5 }} bgcolor="#ffffff" borderTop="1px solid #edf0f4">
              <Box
                sx={{
                  border: "1px solid #dfe3ea",
                  borderRadius: 1.25,
                  bgcolor: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={`Message ${selectedChat.title}`}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  error={Boolean(sendError)}
                  helperText={
                    sendError && connectUrl ? sendError : sendError
                  }
                  disabled={sending || uploading}
                  multiline
                  maxRows={5}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    px: 1.5,
                    pt: 1,
                    "& .MuiFormHelperText-root": { mx: 0 },
                  }}
                />
                <Divider />
                <Box display="flex" alignItems="center" justifyContent="space-between" px={1} py={0.6}>
                  <Stack direction="row" spacing={0.25}>
                    <input
                      type="file"
                      id="chat-file-upload"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    <Tooltip title="Attach files">
                      <span>
                        <IconButton
                          size="small"
                          disabled={uploading || sending}
                          onClick={() =>
                            document.getElementById("chat-file-upload")?.click()
                          }
                        >
                          {uploading ? (
                            <CircularProgress size={18} />
                          ) : (
                            <AttachFileIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Emoji">
                      <IconButton size="small">
                        <EmojiEmotionsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mention">
                      <IconButton
                        size="small"
                        disabled={sending || uploading}
                        onClick={(event) => setMentionAnchorEl(event.currentTarget)}
                      >
                        <AlternateEmailIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Popover
                      open={mentionPickerOpen}
                      anchorEl={mentionAnchorEl}
                      onClose={() => setMentionAnchorEl(null)}
                      anchorOrigin={{ vertical: "top", horizontal: "left" }}
                      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                      PaperProps={{
                        sx: {
                          width: 280,
                          maxHeight: 320,
                          overflowY: "auto",
                          borderRadius: 1,
                        },
                      }}
                    >
                      <Stack sx={{ py: 0.5 }}>
                        {mentionableUsers.map((user) => {
                          const userId = getBuddySendId(user);
                          const name = getBuddyName(user);
                          const email = getBuddyEmail(user);

                          return (
                            <Button
                              key={userId || email || name}
                              onClick={() => insertMention(user)}
                              sx={{
                                justifyContent: "flex-start",
                                textTransform: "none",
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 0,
                              }}
                            >
                              <Avatar sx={{ width: 28, height: 28, mr: 1, fontSize: 13 }}>
                                {name.charAt(0)}
                              </Avatar>
                              <Box textAlign="left" minWidth={0}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {email || userId}
                                </Typography>
                              </Box>
                            </Button>
                          );
                        })}
                      </Stack>
                    </Popover>
                    <Tooltip title="Bold">
                      <IconButton size="small">
                        <FormatBoldIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Italic">
                      <IconButton size="small">
                        <FormatItalicIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Button
                    variant="contained"
                    endIcon={
                      sending ? <CircularProgress color="inherit" size={16} /> : <SendIcon />
                    }
                    onClick={handleSend}
                    disabled={sending || uploading || !inputValue.trim()}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 1,
                      bgcolor: "#6F2DA8",
                      "&:hover": { bgcolor: "#5d238f" },
                    }}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </>
      ) : (
        <Box sx={{ flex: 1 }}>
          <EmptyChatState />
        </Box>
      )}
    </Box>
  );
}
