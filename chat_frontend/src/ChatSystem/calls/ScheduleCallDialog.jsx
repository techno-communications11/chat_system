import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getBuddyEmail, getImageUrl } from "../chatHelpers";
import { createGoogleCalendarEvent } from "../googleCalendar";

const DURATIONS = [15, 30, 45, 60, 90];
const REMINDERS = [0, 5, 10, 15, 30, 60];

function getDefaultStartTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getAttendeeEmails(selectedChat, currentUser) {
  if (selectedChat?.type !== "channel") {
    return [getBuddyEmail(selectedChat?.raw) || selectedChat?.subtitle];
  }

  const currentUserValues = [
    currentUser?.id,
    currentUser?.userId,
    currentUser?.user_id,
    currentUser?.email,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return (selectedChat?.raw?.participants || [])
    .filter((person) => {
      const personValues = [person?.id, person?.userId, person?.user_id, getBuddyEmail(person)]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
      return !personValues.some((value) => currentUserValues.includes(value));
    })
    .map(getBuddyEmail);
}

export default function ScheduleCallDialog({
  currentUser,
  onClose,
  open,
  selectedChat,
}) {
  const attendeeEmails = useMemo(
    () => getAttendeeEmails(selectedChat, currentUser),
    [currentUser, selectedChat],
  );
  const [title, setTitle] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdEvent, setCreatedEvent] = useState(null);

  useEffect(() => {
    if (!open) return;
    const recipient = selectedChat?.title || "this chat";
    setTitle(`Call with ${recipient}`);
    setStartDateTime(getDefaultStartTime());
    setDurationMinutes(30);
    setReminderMinutes(10);
    setSaving(false);
    setError("");
    setCreatedEvent(null);
  }, [open, selectedChat]);

  const handleSchedule = async () => {
    setSaving(true);
    setError("");
    try {
      const event = await createGoogleCalendarEvent({
        attendeeEmails,
        durationMinutes,
        reminderMinutes,
        startDateTime,
        title,
      });
      setCreatedEvent(event);
    } catch (scheduleError) {
      setError(scheduleError?.message || "Unable to schedule the call.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ px: { xs: 2.25, sm: 3 }, pt: 2.5, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 42,
              height: 42,
              borderRadius: 2.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <CalendarMonthIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={750} lineHeight={1.2}>
              Schedule a call
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
              Add it to your Google Calendar in seconds.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: { xs: 2.25, sm: 3 }, py: 2.5 }}>
        {createdEvent ? (
          <Stack spacing={2.25} sx={{ py: 0.5 }}>
            <Alert severity="success" variant="outlined">The call has been added to your Google Calendar.</Alert>
            {createdEvent.htmlLink && (
              <Button
                component="a"
                href={createdEvent.htmlLink}
                rel="noreferrer"
                target="_blank"
                endIcon={<OpenInNewIcon />}
                variant="outlined"
                sx={{ minHeight: 42, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Open in Google Calendar
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing={2.25}>
            {error && <Alert severity="error" variant="outlined">{error}</Alert>}
            <Paper
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 2.5, display: "flex", alignItems: "center", gap: 1.25, bgcolor: "action.hover" }}
            >
              <Avatar src={getImageUrl(selectedChat?.raw)} sx={{ width: 34, height: 34, fontSize: 14, bgcolor: "primary.main" }}>
                {selectedChat?.title?.charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Scheduling with</Typography>
                <Typography variant="body2" fontWeight={700} noWrap>{selectedChat?.title || "this chat"}</Typography>
              </Box>
              <Chip label={selectedChat?.type === "channel" ? "Group call" : "Direct call"} size="small" sx={{ fontWeight: 650 }} />
            </Paper>
            <TextField
              label="Call title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              required
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthIcon fontSize="small" color="action" /></InputAdornment> }}
            />
            <TextField
              label="Starts"
              type="datetime-local"
              value={startDateTime}
              onChange={(event) => setStartDateTime(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
              InputProps={{ startAdornment: <InputAdornment position="start"><AccessTimeRoundedIcon fontSize="small" color="action" /></InputAdornment> }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Duration" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} fullWidth>
                {DURATIONS.map((minutes) => <MenuItem key={minutes} value={minutes}>{minutes} minutes</MenuItem>)}
              </TextField>
              <TextField
                select
                label="Reminder"
                value={reminderMinutes}
                onChange={(event) => setReminderMinutes(event.target.value)}
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><NotificationsNoneRoundedIcon fontSize="small" color="action" /></InputAdornment> }}
              >
                {REMINDERS.map((minutes) => <MenuItem key={minutes} value={minutes}>{minutes === 0 ? "No reminder" : `${minutes} minutes before`}</MenuItem>)}
              </TextField>
            </Stack>
            <Paper variant="outlined" sx={{ borderRadius: 2, px: 1.25, py: 1, bgcolor: "background.default" }}>
              <Typography variant="caption" color="text.secondary">
                {attendeeEmails.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))).length > 0
                  ? "An invitation will be sent to the available chat participant email."
                  : "This event will be added only to your calendar because no participant email is available."}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              Google will ask you to choose the account where this event should be created.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: { xs: 2.25, sm: 3 }, py: 1.75 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>{createdEvent ? "Done" : "Cancel"}</Button>
        {!createdEvent && (
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={saving || !title.trim() || !startDateTime}
            startIcon={saving ? <CircularProgress color="inherit" size={16} /> : <CalendarMonthIcon />}
            sx={{ minHeight: 42, borderRadius: 2, px: 2, textTransform: "none", fontWeight: 700, boxShadow: "none" }}
          >
            Add to Google Calendar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
