import {
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
} from "../chatHelpers";
import { Box, Typography, Avatar, Paper, Button } from "@mui/material";
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
  return (
    <Box px={1} py={1.25} sx={{ overflowY: "auto", minHeight: 0, flex: 1 }}>
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

      <Box display="flex" alignItems="center" gap={0.75} px={1} mb={0.75}>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          ALL CONVERSATIONS
        </Typography>
      </Box>

      {loading ? (
        <LoadingRows />
      ) : (
        filteredItems.map((item) => {
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

      {!loading && filteredItems.length === 0 && (
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
