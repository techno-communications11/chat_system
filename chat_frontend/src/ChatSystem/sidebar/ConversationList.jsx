import {
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
} from "../chatHelpers";
import { useMemo, useState } from "react";
import { Box, Typography, Avatar, Paper, Button, Tab, Tabs } from "@mui/material";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import LoadingRows from "./LoadingRows";
import ConversationListItem from "./ConversationListItem";

const ConversationList = ({
  connectUrl,
  filteredItems = [],
  loadError,
  loading,
  onRefresh,
  onSelectBuddy,
  onSelectChannel,
  selectedChat,
}) => {
  const [conversationFilter, setConversationFilter] = useState("all");
  const visibleItems = useMemo(() => filteredItems.filter((item) => {
    if (conversationFilter === "direct") return item.__conversationType === "person";
    if (conversationFilter === "groups") return item.__conversationType === "channel";
    return true;
  }), [conversationFilter, filteredItems]);

  return (
    <Box px={1.25} py={1.5} sx={{ bgcolor: "var(--chat-canvas)", overflowY: "auto", minHeight: 0, flex: 1 }}>
      {loadError && (
        <Paper
          variant="outlined"
          sx={{ p: 1.5, mb: 1.5, bgcolor: "#fff5f5", borderColor: "#ffc9c9" }}
        >
          <Typography color="error" variant="body2">
            {loadError}
          </Typography>
          {connectUrl && (
            <Button
              size="small"
              variant="contained"
              onClick={onRefresh}
              sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
            >
              Retry
            </Button>
          )}
        </Paper>
      )}

      <Box display="flex" alignItems="center" gap={0.75} px={1} mb={1}>
        <Tabs
          value={conversationFilter}
          onChange={(_, value) => setConversationFilter(value)}
          variant="fullWidth"
          sx={{
            width: "100%",
            minHeight: 34,
            "& .MuiTabs-indicator": { height: 2, borderRadius: 2 },
            "& .MuiTab-root": {
              minHeight: 34,
              minWidth: 0,
              px: 0.5,
              py: 0,
              textTransform: "none",
              fontSize: 12,
              fontWeight: 700,
            },
          }}
        >
          <Tab value="all" label="All" />
          <Tab value="direct" label="Chats" />
          <Tab value="groups" label="Groups" />
        </Tabs>
      </Box>

      {loading ? (
        <LoadingRows />
      ) : (
        visibleItems.map((item) => {
          const isChannelItem = item.__conversationType === "channel";
          return (
            <ConversationListItem
              key={
                isChannelItem
                  ? getChannelId(item) || getChannelName(item)
                  : getBuddySendId(item) || getBuddyName(item)
              }
              item={item}
              isChannel={isChannelItem}
              selectedChat={selectedChat}
              onSelectBuddy={onSelectBuddy}
              onSelectChannel={onSelectChannel}
            />
          );
        })
      )}

      {!loading && visibleItems.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={220}
          textAlign="center"
          px={2}
        >
          <Avatar sx={{ mb: 1.5, bgcolor: "#edf0f4", color: "#5b6472" }}>
            <ChatBubbleIcon />
          </Avatar>
          <Typography fontWeight={700}>No results</Typography>
          <Typography color="text.secondary" variant="body2">
            No conversations match your search.
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default ConversationList;
