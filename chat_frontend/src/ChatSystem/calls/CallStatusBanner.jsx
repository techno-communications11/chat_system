import { Box, Button, Stack, Typography } from "@mui/material";

export default function CallStatusBanner({ activeCall, onEnd }) {
  if (!activeCall) return null;
  const ringing = activeCall.status === "ringing";

  return (
    <Box px={2.5} py={1} display="flex" alignItems="center" justifyContent="space-between" gap={1}
      sx={{ bgcolor: ringing ? "#fff7ed" : "#f0fdf4", borderBottom: "1px solid", borderColor: ringing ? "#fed7aa" : "#bbf7d0" }}>
      <Box minWidth={0}>
        <Typography fontSize={13} fontWeight={800} color={ringing ? "#9a3412" : "#166534"} noWrap>
          {ringing ? "Google Meet calling - waiting for an answer" : "Google Meet accepted"}
        </Typography>
        <Typography fontSize={12} color="text.secondary" noWrap>
          Started by {activeCall.startedBy?.name || "someone"}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.75} flexShrink={0}>
        {activeCall.callUrl && (
          <Button size="small" variant="contained" color="success"
            onClick={() => window.open(activeCall.callUrl, "_blank", "noopener,noreferrer")}>Join Meet</Button>
        )}
        <Button size="small" color={ringing ? "warning" : "error"} onClick={onEnd}>
          {ringing ? "Cancel" : "End"}
        </Button>
      </Stack>
    </Box>
  );
}
