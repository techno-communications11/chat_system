import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ForwardIcon from "@mui/icons-material/Forward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import ReplyIcon from "@mui/icons-material/Reply";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import { REACTION_OPTIONS } from "../../utils/constants";

export default function MessageActions({
  anchorEl,
  canEdit,
  isMe,
  message,
  onBlock,
  onClose,
  onCopy,
  onDelete,
  onEdit,
  onForward,
  onInfo,
  onOpenPicker,
  onPin,
  onReact,
  onReply,
  onSelect,
  selected,
  selectionMode,
}) {
  const close = () => onClose?.();
  const run = (callback) => {
    callback?.(message);
    close();
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={close}
      anchorOrigin={{ vertical: "bottom", horizontal: isMe ? "right" : "left" }}
      transformOrigin={{ vertical: "top", horizontal: isMe ? "right" : "left" }}
      PaperProps={{
        sx: {
          minWidth: 190,
          overflow: "hidden",
          borderRadius: 2,
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
                onReact?.(emoji);
                close();
              }}
              sx={{ width: 30, height: 30, borderRadius: "50%", fontSize: 17 }}
            >
              {emoji}
            </IconButton>
          ))}
          <IconButton
            size="small"
            onClick={(event) => {
              onOpenPicker?.(event.currentTarget);
              close();
            }}
            sx={{ width: 30, height: 30, borderRadius: "50%" }}
          >
            <EmojiEmotionsIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      )}
      <List dense disablePadding>
        <ListItemButton onClick={() => run(onInfo)} sx={{ gap: 1.25, py: 1 }}>
          <InfoOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <ListItemText
            primary="Message info"
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
        <ListItemButton onClick={() => run(onCopy)} sx={{ gap: 1.25, py: 1 }}>
          <ContentCopyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <ListItemText
            primary="Copy"
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
        {isMe && (
          <ListItemButton
            onClick={() => {
              onSelect?.(message);
              close();
            }}
            sx={{ gap: 1.25, py: 1 }}
          >
            <SelectAllIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Select"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
        )}
        <ListItemButton onClick={() => run(onReply)} sx={{ gap: 1.25, py: 1 }}>
          <ReplyIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <ListItemText
            primary="Reply"
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
        {canEdit && (
          <ListItemButton onClick={() => run(onEdit)} sx={{ gap: 1.25, py: 1 }}>
            <EditIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Edit"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </ListItemButton>
        )}
        <ListItemButton
          onClick={() => run(onForward)}
          sx={{ gap: 1.25, py: 1 }}
        >
          <ForwardIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <ListItemText
            primary="Forward"
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
        <ListItemButton onClick={() => run(onPin)} sx={{ gap: 1.25, py: 1 }}>
          <PushPinIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <ListItemText
            primary={message.metadata?.pinned ? "Unpin" : "Pin"}
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
        {isMe && (
          <ListItemButton
            onClick={() => run(onDelete)}
            sx={{ gap: 1.25, py: 1 }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18, color: "error.main" }} />
            <ListItemText
              primary="Delete"
              primaryTypographyProps={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "error.main",
              }}
            />
          </ListItemButton>
        )}
        {!isMe && onBlock && (
          <ListItemButton
            onClick={() => run(onBlock)}
            sx={{ gap: 1.25, py: 1 }}
          >
            <BlockIcon sx={{ fontSize: 18, color: "error.main" }} />
            <ListItemText
              primary="Block user"
              primaryTypographyProps={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "error.main",
              }}
            />
          </ListItemButton>
        )}
      </List>
    </Popover>
  );
}
