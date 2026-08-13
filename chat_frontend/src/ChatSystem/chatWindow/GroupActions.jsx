import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import GroupsIcon from "@mui/icons-material/Groups";
import InfoIcon from "@mui/icons-material/Info";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getImageUrl,
} from "../chatHelpers";

const BRAND_SOFT = "var(--chat-soft)";
const BRAND_TEXT = "var(--chat-brand-text)";

export default function GroupActions({
  anchorEl,
  currentUser,
  groupInfoOpen,
  groupMembers,
  isGroupMuted,
  isSamePerson,
  leaveConfirmOpen,
  onCloseInfo,
  onCloseLeaveConfirm,
  onCloseMenu,
  onLeaveGroup,
  onOpenInfo,
  onOpenMedia,
  onClearChat,
  onOpenLeaveConfirm,
  onToggleMute,
  open,
  selectedChat,
}) {
  if (selectedChat?.type !== "channel") return null;

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 240,
            borderRadius: "10px",
            border: "0.5px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
            overflow: "hidden",
          },
        }}
      >
        <List dense disablePadding>
          <ListItemButton onClick={onOpenInfo} sx={{ gap: 1.25, py: 1 }}>
            <InfoIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText
              primary="Group info"
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
            />
          </ListItemButton>
          <ListItemButton onClick={onToggleMute} sx={{ gap: 1.25, py: 1 }}>
            {isGroupMuted ? (
              <NotificationsActiveIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
            ) : (
              <NotificationsOffIcon
                sx={{ fontSize: 18, color: "text.secondary" }}
              />
            )}
            <ListItemText
              primary={
                isGroupMuted ? "Unmute notifications" : "Mute notifications"
              }
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}
            />
          </ListItemButton>
          <ListItemButton onClick={onOpenMedia} sx={{ gap: 1.25, py: 1 }}>
            <AttachFileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <ListItemText primary="Media, links & files" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
          </ListItemButton>
          <ListItemButton onClick={onClearChat} sx={{ gap: 1.25, py: 1 }}>
            <DeleteSweepIcon sx={{ fontSize: 18, color: "error.main" }} />
            <ListItemText primary="Clear chat" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: "error.main" }} />
          </ListItemButton>
          <Divider />
          <ListItemButton
            onClick={onOpenLeaveConfirm}
            sx={{ gap: 1.25, py: 1 }}
          >
            <ExitToAppIcon sx={{ fontSize: 18, color: "#d32f2f" }} />
            <ListItemText
              primary="Exit group"
              primaryTypographyProps={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#d32f2f",
              }}
            />
          </ListItemButton>
        </List>
      </Popover>

      <Dialog
        open={groupInfoOpen}
        onClose={onCloseInfo}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Group info</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" alignItems="center" gap={1.25} mb={2}>
            <Avatar
              src={selectedChat.imageUrl}
              sx={{
                width: 52,
                height: 52,
                bgcolor: BRAND_SOFT,
                color: BRAND_TEXT,
                fontWeight: 800,
              }}
            >
              <GroupsIcon />
            </Avatar>
            <Box minWidth={0}>
              <Typography fontWeight={800} noWrap>
                {selectedChat.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {groupMembers.length || 0} members
              </Typography>
              {isGroupMuted && (
                <Typography variant="caption" color="text.secondary">
                  Notifications muted
                </Typography>
              )}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            MEMBERS
          </Typography>
          <List dense disablePadding sx={{ mt: 0.75 }}>
            {groupMembers.map((member) => {
              const memberId = getBuddySendId(member) || getBuddyEmail(member);
              const isCurrentMember = isSamePerson(member, currentUser);

              return (
                <ListItemButton key={memberId || getBuddyName(member)} disabled>
                  <Avatar
                    src={getImageUrl(member)}
                    sx={{
                      width: 30,
                      height: 30,
                      mr: 1.25,
                      fontSize: 12,
                      bgcolor: BRAND_SOFT,
                      color: BRAND_TEXT,
                    }}
                  >
                    {getBuddyName(member).charAt(0)}
                  </Avatar>
                  <ListItemText
                    primary={isCurrentMember ? "You" : getBuddyName(member)}
                    secondary={getBuddyEmail(member)}
                    primaryTypographyProps={{ fontSize: 13.5, fontWeight: 700 }}
                    secondaryTypographyProps={{ fontSize: 12, noWrap: true }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseInfo}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={leaveConfirmOpen}
        onClose={onCloseLeaveConfirm}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Exit group?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You will stop receiving messages from {selectedChat.title}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseLeaveConfirm}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onCloseLeaveConfirm();
              onLeaveGroup?.(selectedChat.id);
            }}
          >
            Exit group
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
