import { useState } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { EMOJI_OPTIONS } from "../../utils/constants";

export default function EmojiPicker({ anchorEl, onClose, onSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const open = Boolean(anchorEl);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const emojis = EMOJI_OPTIONS.filter(([, name]) =>
    name.includes(normalizedSearch),
  );

  const closePicker = () => {
    setSearchTerm("");
    onClose?.();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={closePicker}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      PaperProps={{
        sx: {
          width: 300,
          maxWidth: "calc(100vw - 24px)",
          borderRadius: 2,
          border: "0.5px solid",
          borderColor: "divider",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          p: 1.25,
        },
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Search emoji"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.25 }}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
          maxHeight: 250,
          overflowY: "auto",
        }}
      >
        {emojis.map(([emoji, name]) => (
          <IconButton
            key={emoji}
            className="chat-emoji"
            size="small"
            onClick={() => {
              onSelect?.(emoji);
              closePicker();
            }}
            title={name}
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              fontSize: 23,
              lineHeight: 1,
              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
              fontWeight: 400,
              color: "inherit",
              textRendering: "geometricPrecision",
              WebkitFontSmoothing: "antialiased",
              transform: "translateZ(0)",
              "&:hover": { bgcolor: "var(--chat-soft)" },
            }}
          >
            {emoji}
          </IconButton>
        ))}
      </Box>
      {emojis.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 2 }}
        >
          No emoji found
        </Typography>
      )}
    </Popover>
  );
}
