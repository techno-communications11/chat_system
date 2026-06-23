import { Box, Typography } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";

export default function PinglyMark({ size = 34, showWord = false }) {
  return (
    <Box display="flex" alignItems="center" gap={1} minWidth={0}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: "#6F2DA8",
          color: "#ffffff",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 6px 16px rgba(111,45,168,0.2)",
          flexShrink: 0,
        }}
      >
        <ChatBubbleIcon sx={{ fontSize: Math.round(size * 0.58) }} />
      </Box>
      {showWord && (
        <Typography fontWeight={900} noWrap sx={{ letterSpacing: 0 }}>
          Pingly
        </Typography>
      )}
    </Box>
  );
}
