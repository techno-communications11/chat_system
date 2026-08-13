import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import VideocamIcon from "@mui/icons-material/Videocam";

export default function IncomingCallDialog({
  call,
  error,
  responding,
  onAccept,
  onDecline,
}) {
  return (
    <Dialog open={Boolean(call)} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogContent sx={{ textAlign: "center", pt: 4 }}>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2,
            bgcolor: "primary.main",
          }}
        >
          <VideocamIcon fontSize="large" />
        </Avatar>
        <Typography variant="h6" fontWeight={800}>
          {call?.startedBy?.name || "Chat user"}
        </Typography>
        <Typography color="text.secondary">Incoming chat call</Typography>
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Accept to join a private in-app call.
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", gap: 2, pb: 3 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEndIcon />}
          disabled={responding}
          onClick={onDecline}
        >
          Decline
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<VideocamIcon />}
          disabled={responding}
          onClick={onAccept}
        >
          Accept &amp; join
        </Button>
      </DialogActions>
    </Dialog>
  );
}
