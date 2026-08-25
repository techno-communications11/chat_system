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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LogoutIcon from "@mui/icons-material/Logout";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import { getImageUrl } from "../chatHelpers";
import { clearAuthToken } from "../../utils/authToken";
import { updateChatSettingsService } from "../../Services/chat.services";
import { getInitial, statusOptions } from "./sidebarUtils";
import { useThemeMode } from "../../themeMode";
import { useState } from "react";

export default function ChatSidebarSettingsDialog({
  avatarUploading,
  currentStatus,
  currentUser,
  currentUserName,
  enterToSend = false,
  notificationPermission,
  notificationsEnabled,
  onAvatarPick,
  onClose,
  onStatusPick,
  onTestNotification,
  onToggleNotifications,
  onEnterToSendChange,
  onLogout,
  open,
  settingsNotice,
  statusSaving,
  page = false,
}) {
  const { mode, setMode } = useThemeMode();
  const isDarkMode = mode === "dark";
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const sectionSx = {
    p: { xs: 1.5, sm: 2 },
    mb: 1.5,
    borderRadius: 3,
    bgcolor: isDarkMode ? "rgba(255,255,255,0.045)" : "rgba(111,45,168,0.035)",
    border: "1px solid",
    borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(111,45,168,0.12)",
  };

  const surfaceSx = {
          color: isDarkMode ? "#ffffff" : "text.primary",
          "& .MuiTypography-root": { color: isDarkMode ? "#ffffff" : "text.primary" },
          "& .MuiTypography-colorTextSecondary": {
            color: isDarkMode ? "rgba(255,255,255,0.72)" : "text.secondary",
          },
          "& .MuiButton-root": { color: isDarkMode ? "#ffffff" : "primary.main" },
          "& .MuiToggleButton-root": {
            color: isDarkMode ? "#ffffff" : "text.primary",
            borderColor: isDarkMode ? "rgba(255,255,255,0.35)" : "divider",
          },
          "& .MuiToggleButton-root.Mui-selected": {
            color: isDarkMode ? "#ffffff" : "primary.main",
            bgcolor: isDarkMode ? "rgba(255,255,255,0.18)" : "action.selected",
          },
        };
  const SettingsContainer = page ? Box : Dialog;
  const containerProps = page
    ? { sx: { position: "fixed", zIndex: 10, top: 0, bottom: 0, left: { xs: 0, sm: 320, md: 380 }, width: { xs: "100vw", sm: "calc(100vw - 320px)", md: "calc(100vw - 380px)" }, overflowY: "auto", bgcolor: "var(--chat-canvas)", display: "flex", justifyContent: "center", alignItems: "flex-start", p: { xs: 2, sm: 5 }, border: 0, boxShadow: "none" } }
    : { open, onClose, fullWidth: true, maxWidth: "xs", PaperProps: { sx: { ...surfaceSx, borderRadius: 4, overflow: "hidden" } } };

  return (
    <SettingsContainer {...containerProps}>
      <Box sx={page ? { width: "100%", maxWidth: 560, bgcolor: "var(--chat-canvas)", borderRadius: 0, p: { xs: 2, sm: 3 }, border: 0, boxShadow: "none", ...surfaceSx } : undefined}>
      <DialogTitle sx={{
        ...(page ? { px: 0, pt: 0 } : {}),
        fontSize: { xs: "1.35rem", sm: "1.5rem" },
        fontWeight: 850,
        letterSpacing: "-0.02em",
      }}>
        Settings
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, fontWeight: 450 }}>
          Manage your profile, presence, and chat preferences
        </Typography>
      </DialogTitle>
      <DialogContent dividers={ !page } sx={page ? { px: 0 } : undefined}>
        <Box sx={{ ...sectionSx, display: "flex", alignItems: "center", gap: 1.5 }}>
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
            onClick={(event) => setProfileMenuAnchor(event.currentTarget)}
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

        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={() => setProfileMenuAnchor(null)}
        >
          <MenuItem onClick={() => {
            setProfileMenuAnchor(null);
            window.setTimeout(() => setProfileOpen(true), 0);
          }}>
            <PersonOutlineIcon fontSize="small" sx={{ mr: 1 }} />
            View profile
          </MenuItem>
          <MenuItem onClick={() => {
            setProfileMenuAnchor(null);
            window.setTimeout(() => onAvatarPick?.(), 0);
          }}>
            <UploadFileIcon fontSize="small" sx={{ mr: 1 }} />
            Upload profile photo
          </MenuItem>
        </Menu>

        <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ pb: 0 }}>Profile</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ borderRadius: 3, overflow: "hidden", bgcolor: "#f7f4ff", border: "1px solid #ebe5ff" }}>
              <Box sx={{ height: 72, background: "linear-gradient(135deg, #6F2DA8, #4f46e5)" }} />
              <Box display="flex" flexDirection="column" alignItems="center" sx={{ px: 2, pb: 2.5, mt: -5 }}>
                <Avatar src={getImageUrl(currentUser)} sx={{ width: 92, height: 92, border: "4px solid #fff", bgcolor: "#6F2DA8", fontSize: 30, fontWeight: 900, boxShadow: "0 6px 18px rgba(54,35,120,.2)" }}>
                  {getInitial(currentUserName)}
                </Avatar>
                <Typography variant="h6" fontWeight={850} sx={{ mt: 1 }}>{currentUserName}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: "100%" }}>{currentUser?.email || "Pingly user"}</Typography>
                <Box display="flex" alignItems="center" gap={0.75} sx={{ mt: 1, px: 1.25, py: 0.5, borderRadius: 99, bgcolor: "#e9f9ef", color: "#16803c" }}>
                  <CircleIcon sx={{ fontSize: 9 }} />
                  <Typography variant="caption" fontWeight={800}>{currentStatus}</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
              {[
                [<WorkOutlineIcon />, "Designation", currentUser?.designation || currentUser?.jobTitle],
                [<SupervisorAccountOutlinedIcon />, "Manager", currentUser?.managerName || currentUser?.manager_name],
                [<PublicOutlinedIcon />, "Market", currentUser?.market || currentUser?.marketName],
              ].map(([icon, label, value]) => (
                <Box key={label} display="flex" alignItems="center" gap={1.25} sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Box sx={{ display: "grid", placeItems: "center", color: "#6F2DA8" }}>{icon}</Box>
                  <Box minWidth={0}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
                    <Typography variant="body2" fontWeight={750} noWrap>{value || "Not set"}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Box sx={sectionSx}>
          <Typography variant="subtitle2" fontWeight={850} sx={{ mb: 1.1 }}>
            Presence
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
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
        </Box>

        <Box sx={{ ...sectionSx, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
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
        <Box sx={{ ...sectionSx, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box minWidth={0}>
            <Typography fontWeight={800}>Enter to send</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Press Enter to send messages
            </Typography>
          </Box>
          <Switch checked={enterToSend} onChange={(event) => onEnterToSendChange?.(event.target.checked)} />
        </Box>
        <Box sx={{ ...sectionSx, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            <DarkModeIcon color="primary" />
            <Box minWidth={0}>
              <Typography fontWeight={800}>Dark mode</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Use a darker chat appearance
              </Typography>
            </Box>
          </Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, nextMode) => {
              if (!nextMode) return;
              setMode(nextMode);
              updateChatSettingsService({ themeMode: nextMode }).catch(() => {});
            }}
            aria-label="Choose theme"
          >
            <ToggleButton value="light" aria-label="Light theme" sx={{ textTransform: "none", gap: 0.5 }}>
              <LightModeIcon fontSize="small" />
              Light
            </ToggleButton>
            <ToggleButton value="dark" aria-label="Dark theme" sx={{ textTransform: "none", gap: 0.5 }}>
              <DarkModeIcon fontSize="small" />
              Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </DialogContent>
      <DialogActions sx={{ ...(page ? { px: 0, pb: 0 } : {}), pt: 1, gap: 0.5 }}>
        <Button
          color="error"
          startIcon={<LogoutIcon />}
          onClick={async () => {
            onClose();
            try {
              if (onLogout) {
                await onLogout();
              } else {
                window.location.replace("/login");
              }
            } finally {
              clearAuthToken();
              sessionStorage.clear();
              localStorage.clear();
            }
          }}
          sx={{ mr: "auto" }}
        >
          Logout
        </Button>
        <Button onClick={onTestNotification}>Test</Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", pt: 1.5, pb: page ? 0 : 1.5, opacity: 0.8 }}
      >
        Created by Tharu Potharaju
      </Typography>
      </Box>
    </SettingsContainer>
  );
}
