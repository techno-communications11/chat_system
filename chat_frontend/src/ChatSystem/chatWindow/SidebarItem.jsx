import { Avatar, Box, Typography } from "@mui/material";
import { getAvailability } from "../chatHelpers";

const BRAND = "#6F2DA8";
const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";
const SIDEBAR_BG = "#1a0a2e";

export default function SidebarItem({ chat, active = false, onClick }) {
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
        <Typography fontSize={13} sx={{ color: "rgba(255,255,255,.35)", lineHeight: 1, flexShrink: 0 }}>#</Typography>
      ) : (
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar src={chat.imageUrl} sx={{ width: 20, height: 20, fontSize: 9, fontWeight: 600, bgcolor: BRAND_SOFT, color: BRAND_TEXT }}>
            {chat.title.charAt(0)}
          </Avatar>
          {availability?.color === "#22c55e" && (
            <Box sx={{ position: "absolute", bottom: -1, right: -1, width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", border: `1.5px solid ${SIDEBAR_BG}` }} />
          )}
        </Box>
      )}
      <Typography fontSize={13} noWrap sx={{ color: active ? "#fff" : "rgba(255,255,255,.7)", fontWeight: active ? 500 : 400, flex: 1, minWidth: 0 }}>
        {chat.title}
      </Typography>
      {chat.unreadCount > 0 && (
        <Box sx={{ fontSize: 10, fontWeight: 600, bgcolor: BRAND, color: "#fff", borderRadius: "999px", px: 0.75, minWidth: 18, textAlign: "center", flexShrink: 0 }}>
          {chat.unreadCount}
        </Box>
      )}
    </Box>
  );
}
