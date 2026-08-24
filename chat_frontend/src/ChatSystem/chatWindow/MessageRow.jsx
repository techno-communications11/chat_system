import { useRef, useState } from "react";
import {
  Avatar,
  Box,
  Link,
  Popover,
  Stack,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DoneIcon from "@mui/icons-material/Done";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PushPinIcon from "@mui/icons-material/PushPin";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import DownloadIcon from "@mui/icons-material/Download";
import MessageActions from "./MessageActions";
import { getBuddyName, getImageUrl } from "../chatHelpers";
import { REACTION_OPTIONS } from "../../utils/constants";

const BRAND = "#6F2DA8";
const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function LinkifiedMessageText({ text }) {
  return String(text || "").split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 0) return <span key={`text-${index}`}>{part}</span>;

    const trailing = part.match(/[),.!?:;]+$/)?.[0] || "";
    const urlText = trailing ? part.slice(0, -trailing.length) : part;
    const href = urlText.startsWith("www.") ? `https://${urlText}` : urlText;

    return (
      <span key={`link-${index}`}>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          onClick={(event) => event.stopPropagation()}
        >
          {urlText}
        </Link>
        {trailing}
      </span>
    );
  });
}

function FormattedMessageText({ text }) {
  const formatPattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts = String(text || "").split(formatPattern);

  return parts.map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={`bold-${index}`}><LinkifiedMessageText text={part.slice(2, -2)} /></strong>;
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={`italic-${index}`}><LinkifiedMessageText text={part.slice(1, -1)} /></em>;
    }
    return <LinkifiedMessageText key={`text-${index}`} text={part} />;
  });
}

export default function MessageRow({
  authorName,
  currentUser,
  message,
  onCopy,
  onDelete,
  onEdit,
  onForward,
  onPin,
  onReact,
  onReply,
  onSelect,
  selected = false,
  selectionMode = false,
  showAvatar = true,
}) {
  const [actionsAnchor, setActionsAnchor] = useState(null);
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const dragStart = useRef(null);
  const isMe = message.direction === "outbound";
  const age = Date.now() - new Date(message.sentAt).getTime();
  const canEdit =
    isMe && Number.isFinite(age) && age >= 0 && age <= 10 * 60 * 1000;
  const avatar = isMe ? getImageUrl(currentUser) : message.authorAvatarUrl;
  const initials = (
    isMe ? getBuddyName(currentUser) : authorName || "?"
  ).charAt(0);

  const react = (emoji) => {
    if (!isMe) onReact?.(message.id, emoji);
    setReactionAnchor(null);
  };

  return (
    <Box
      className="chat-message-in"
      onPointerDown={(event) => {
        dragStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!dragStart.current) return;
        const dx = event.clientX - dragStart.current.x;
        const dy = Math.abs(event.clientY - dragStart.current.y);
        dragStart.current = null;
        if (Math.abs(dx) > 72 && dy < 32) onReply?.(message);
      }}
      sx={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        justifyContent: isMe ? "flex-end" : "flex-start",
        gap: 1.25,
        px: 1,
        py: 0.625,
        borderRadius: 1,
        bgcolor: selected ? "action.selected" : "transparent",
      }}
    >
      <Box sx={{ width: 34, flexShrink: 0, display: isMe ? "none" : "block" }}>
        {showAvatar && !isMe && (
          <Avatar
            src={avatar}
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              fontSize: 12,
              bgcolor: BRAND_SOFT,
              color: BRAND_TEXT,
            }}
          >
            {initials}
          </Avatar>
        )}
      </Box>
      <Box
        minWidth={0}
        onClick={(event) => setActionsAnchor(event.currentTarget)}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMe ? "flex-end" : "flex-start",
          minWidth: 0,
          maxWidth: { xs: "92%", sm: "82%", md: "68%" },
        }}
      >
        {showAvatar && !isMe && (
          <Typography
            fontSize={12.5}
            fontWeight={700}
            color="primary.main"
            mb={0.375}
          >
            {authorName}
          </Typography>
        )}
        <Box
          sx={{
            px: 1.4,
            py: 0.9,
            borderRadius: isMe ? "10px 2px 10px 10px" : "2px 10px 10px 10px",
            bgcolor: (theme) =>
              isMe
                ? theme.palette.mode === "dark"
                  ? "#373064"
                  : "#eeeaff"
                : theme.palette.mode === "dark" ? "#1d2336" : "#ffffff",
            border: "1px solid",
            borderColor: "divider",
            maxWidth: "100%",
            boxShadow: isMe
              ? "0 2px 8px rgba(103,80,232,.08)"
              : "0 2px 8px rgba(35,42,70,.045)",
            transition: "box-shadow 160ms ease, transform 160ms ease",
            "&:hover": { boxShadow: "0 5px 16px rgba(35,42,70,.10)" },
          }}
        >
          {message.metadata?.pinned && (
            <Box display="flex" alignItems="center" gap={0.4} mb={0.5}>
              <PushPinIcon sx={{ fontSize: 12 }} />
              <Typography fontSize={11} fontWeight={700}>
                Pinned
              </Typography>
            </Box>
          )}
          <Typography
            fontSize={12}
            color="text.primary"
            lineHeight={1.2}
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            <FormattedMessageText text={message.text} />
          </Typography>
          {message.edited && (
            <Typography fontSize={10} color="text.secondary" textAlign="right">
              edited
            </Typography>
          )}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-end"
            gap={0.35}
            mt={0.3}
          >
            <Typography fontSize={10} color="text.secondary">
              {message.timestamp || ""}
            </Typography>
            {isMe &&
              (message.deliveryStatus === "seen" ? (
                <DoneAllIcon sx={{ fontSize: 15, color: "#2196f3" }} />
              ) : (
                <DoneIcon sx={{ fontSize: 15, color: "#7b8794" }} />
              ))}
          </Box>
        </Box>
        {message.attachments?.length > 0 && (
          <Stack spacing={0.75} mt={message.text ? 0.75 : 0}>
            {message.attachments.map((file) => (
              (() => {
                const type = String(file.contentType || "").toLowerCase();
                const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || "");

                if (isImage && file.url) {
                  return (
                    <Box key={file.id} sx={{ width: "100%", maxWidth: "min(320px, 100%)", borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                      <Link href={file.url} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
                        <Box component="img" src={file.url} alt={file.name || "Shared image"} loading="lazy" sx={{ display: "block", width: "100%", maxWidth: "100%", maxHeight: 280, objectFit: "cover", cursor: "pointer", "&:hover": { opacity: 0.9 } }} />
                      </Link>
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ px: 1, py: 0.5 }}>
                        <Typography fontSize={11} color="text.secondary" noWrap sx={{ minWidth: 0, flex: 1 }}>
                          {file.name}
                        </Typography>
                        <Tooltip title="Download">
                          <span>
                            <IconButton
                              component="a"
                              href={file.url}
                              download={file.name || true}
                              size="small"
                              disabled={!file.url}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Download ${file.name || "image"}`}
                            >
                              <DownloadIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                }

                return (
                  <Box key={file.id} display="flex" alignItems="center" gap={1} sx={{ width: "100%", maxWidth: "min(360px, 100%)", minWidth: 0, border: "0.5px solid", borderColor: "divider", borderRadius: 1, px: 1, py: 0.875, bgcolor: "background.paper" }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: BRAND_SOFT, color: BRAND_TEXT, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <InsertDriveFileIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box minWidth={0} flex={1}>
                      <Link href={file.url || undefined} target={file.url ? "_blank" : undefined} rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} underline="hover">
                        <Typography fontSize={13} fontWeight={600} color="text.primary" noWrap>{file.name}</Typography>
                      </Link>
                      <Typography fontSize={11} color="text.secondary" noWrap>
                        {[file.contentType || "Document", formatFileSize(file.size)].filter(Boolean).join(" - ")}
                      </Typography>
                    </Box>
                    <Tooltip title="Download">
                      <span>
                        <IconButton
                          component="a"
                          href={file.url || undefined}
                          download={file.name || true}
                          size="small"
                          disabled={!file.url}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Download ${file.name || "file"}`}
                        >
                          <DownloadIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                );
              })()
            ))}
          </Stack>
        )}
        {message.reactions?.length > 0 && (
          <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.75}>
            {message.reactions.map((reaction) => (
              <Box
                key={reaction.emoji}
                onClick={(event) => {
                  event.stopPropagation();
                  react(reaction.emoji);
                }}
                sx={{
                  display: "inline-flex",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 5,
                  border: "0.5px solid",
                  borderColor: reaction.reacted ? "#a78bfa" : "divider",
                  bgcolor: reaction.reacted ? BRAND_SOFT : "background.paper",
                  cursor: "pointer",
                }}
              >
                {reaction.emoji} {reaction.count || 1}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <MessageActions
        anchorEl={actionsAnchor}
        canEdit={canEdit}
        isMe={isMe}
        message={message}
        onClose={() => setActionsAnchor(null)}
        onCopy={onCopy}
        onDelete={onDelete}
        onEdit={onEdit}
        onForward={onForward}
        onOpenPicker={(anchor) => setReactionAnchor(anchor)}
        onPin={onPin}
        onReact={react}
        onReply={onReply}
        onSelect={onSelect}
        selected={selected}
        selectionMode={selectionMode}
      />
      {!isMe && (
        <Popover
          open={Boolean(reactionAnchor)}
          anchorEl={reactionAnchor}
          onClose={() => setReactionAnchor(null)}
        >
          <Box display="flex" p={0.75}>
            {REACTION_OPTIONS.map((emoji) => (
              <Box
                key={emoji}
                onClick={() => react(emoji)}
                sx={{
                  p: 0.75,
                  cursor: "pointer",
                  fontSize: 18,
                  "&:hover": { bgcolor: BRAND_SOFT },
                }}
              >
                {emoji}
              </Box>
            ))}
          </Box>
        </Popover>
      )}
    </Box>
  );
}
