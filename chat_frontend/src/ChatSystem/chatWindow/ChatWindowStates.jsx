import { Avatar, Box, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import { getAvailability } from "../chatHelpers";
import PinglyMark from "../PinglyMark";

const BRAND = "#6F2DA8";
const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";
const SIDEBAR_BG = "#1a0a2e";

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
      }}
    >
      {isChannel ? (
        <Typography fontSize={13} sx={{ color: "rgba(255,255,255,.35)" }}>
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
          }}
        >
          {chat.unreadCount}
        </Box>
      )}
    </Box>
  );
}

export function ChatWindowSidebar({
  selectedChat,
  setSelectedChat,
  chats = [],
}) {
  const channels = chats.filter((chat) => chat.type === "channel");

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

export function EmptyChatState() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      textAlign="center"
      px={3}
      sx={{ bgcolor: "background.paper" }}
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

export function ReadyToSendState({ selectedChat }) {
  const isGroup = selectedChat.type === "channel";

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
            bgcolor:
              selectedChat.type === "channel"
                ? BRAND_SOFT
                : "var(--chat-blue-soft)",
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
        <Typography
          variant="body2"
          color="text.secondary"
          lineHeight={1.65}
          fontSize={13}
        >
          {isGroup
            ? "This is the beginning of this group. Send a message to everyone."
            : `This is the very beginning of your direct message history with ${selectedChat.title}. Say hello!`}
        </Typography>
      </Box>
    </Box>
  );
}
