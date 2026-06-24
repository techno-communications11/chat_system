import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { getImageUrl } from "../chatHelpers";
import { getInitial, statusOptions } from "./sidebarUtils";

export default function ChatSidebarSettingsDialog({
  avatarUploading,
  currentStatus,
  currentUser,
  currentUserName,
  notificationPermission,
  notificationsEnabled,
  onAvatarPick,
  onClose,
  onStatusPick,
  onTestNotification,
  onToggleNotifications,
  open,
  settingsNotice,
  statusSaving,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              avatarUploading ? (
                <CircularProgress size={12} sx={{ color: "#ffffff" }} />
              ) : (
                <PhotoCameraIcon sx={{ fontSize: 12, color: "#ffffff" }} />
              )
            }
            sx={{
              cursor: "pointer",
              "& .MuiBadge-badge": {
                width: 20,
                height: 20,
                minWidth: 20,
                bgcolor: "#6F2DA8",
                border: "2px solid #ffffff",
              },
            }}
            onClick={onAvatarPick}
          >
            <Avatar
              src={getImageUrl(currentUser)}
              sx={{
                width: 58,
                height: 58,
                bgcolor: "#6F2DA8",
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              {getInitial(currentUserName)}
            </Avatar>
          </Badge>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>
              Current account
            </Typography>
            <Typography fontWeight={800} noWrap>
              {currentUserName}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {currentUser?.email || "Pingly user"}
            </Typography>
          </Box>
        </Box>

        <Typography variant="caption" fontWeight={800} color="text.secondary">
          Presence
        </Typography>
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mt={1} mb={2}>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant={option.value === currentStatus ? "contained" : "outlined"}
              disabled={statusSaving}
              onClick={() => onStatusPick(option.value)}
              startIcon={<CircleIcon sx={{ fontSize: 12, color: option.color }} />}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                borderRadius: 1,
                fontWeight: 700,
                bgcolor: option.value === currentStatus ? "#6F2DA8" : undefined,
                "&:hover": {
                  bgcolor: option.value === currentStatus ? "#5d238f" : undefined,
                },
              }}
            >
              {option.label}
            </Button>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <NotificationsActiveIcon sx={{ color: "#6F2DA8" }} />
            <Box minWidth={0}>
              <Typography fontWeight={800}>Desktop notifications</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {notificationPermission}
              </Typography>
            </Box>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={notificationsEnabled}
                onChange={onToggleNotifications}
                disabled={notificationPermission === "denied"}
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Box>
        {settingsNotice && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
            {settingsNotice}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onTestNotification}>Test</Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
