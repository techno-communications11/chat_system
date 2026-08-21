import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getImageUrl,
} from "../chatHelpers";
import { getInitial } from "../sidebar/sidebarUtils";

export function GroupCreationDialog({
  error,
  members,
  onClose,
  onCreate,
  onSearchChange,
  onSelectMember,
  open,
  search,
  selectedMembers,
  title,
  onTitleChange,
  creating,
  page = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      hideBackdrop={page}
      fullWidth
      maxWidth={page ? false : "sm"}
      PaperProps={{
        sx: page
          ? {
              position: "fixed",
              top: 0,
              bottom: 0,
              left: { xs: 0, sm: 320, md: 380 },
              width: { xs: "100vw", sm: "calc(100vw - 320px)", md: "calc(100vw - 380px)" },
              maxWidth: "none",
              maxHeight: "none",
              height: "100vh",
              m: 0,
              borderRadius: 0,
              border: 0,
              boxShadow: "none",
              bgcolor: "var(--chat-canvas)",
            }
          : { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, boxShadow: "0 8px 20px rgba(111,45,168,.2)" }}>
            <GroupIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-.02em">
              New group
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create a space for your team and friends
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <TextField
          fullWidth
          autoFocus
          label="Group name"
          placeholder="Enter a group name"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          inputProps={{ maxLength: 80 }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2.5, mb: 0.75, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}
        >
          Selected members{" "}
          {selectedMembers.length ? `(${selectedMembers.length})` : ""}
        </Typography>
        {selectedMembers.length > 0 ? (
          <Box display="flex" gap={0.75} flexWrap="wrap" sx={{ mb: 1.5 }}>
            {selectedMembers.map((buddy) => {
              const userId = String(getBuddySendId(buddy));
              return (
                <Box
                  key={userId}
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    borderRadius: 5,
                    bgcolor: "action.selected",
                  }}
                >
                  <Avatar
                    src={getImageUrl(buddy)}
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                  >
                    {getInitial(getBuddyName(buddy))}
                  </Avatar>
                  <Typography variant="body2" noWrap>
                    {getBuddyName(buddy)}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => onSelectMember(userId)}
                    sx={{ minWidth: 20, p: 0, fontSize: 16 }}
                  >
                    ×
                  </Button>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select at least one person to start the group.
          </Typography>
        )}
        <TextField
          fullWidth
          size="small"
          placeholder="Search people"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, bgcolor: "action.hover" } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
        <List sx={{ maxHeight: 360, overflow: "auto", mt: 1.25, p: 0.25 }}>
          {members.map((buddy) => {
            const userId = String(getBuddySendId(buddy));
            const checked = selectedMembers.some(
              (member) => String(getBuddySendId(member)) === userId,
            );
            return (
              <ListItemButton
                key={userId}
                onClick={() => onSelectMember(userId)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  px: 1.25,
                  py: 0.75,
                  bgcolor: checked ? "action.selected" : "transparent",
                  border: "1px solid",
                  borderColor: checked ? "primary.main" : "transparent",
                  transition: "background-color 160ms ease, border-color 160ms ease, transform 160ms ease",
                  "&:hover": { bgcolor: checked ? "action.selected" : "action.hover", transform: "translateX(2px)" },
                }}
              >
                  <Avatar
                    src={getImageUrl(buddy)}
                    sx={{ width: 42, height: 42, mr: 1.25, border: checked ? "2px solid" : "0 solid", borderColor: "primary.main" }}
                >
                  {getInitial(getBuddyName(buddy))}
                </Avatar>
                <ListItemText
                  primary={getBuddyName(buddy)}
                  secondary={getBuddyEmail(buddy)}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                {checked && <CheckCircleIcon color="primary" sx={{ fontSize: 21, mr: 0.5 }} />}
              </ListItemButton>
            );
          })}
          {members.length === 0 && (
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ py: 3, textAlign: "center" }}
            >
              No people found.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onCreate}
          disabled={creating || !title.trim() || selectedMembers.length === 0}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 2.5,
            fontWeight: 700,
          }}
        >
          {creating ? "Creating…" : "Create group"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AddMembersDialog({
  error,
  members,
  onAdd,
  onClose,
  onSelect,
  open,
  selectedIds,
  adding,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add people to group</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
          {members.map((buddy) => {
            const userId = String(getBuddySendId(buddy));
            const checked = selectedIds.includes(userId);
            return (
              <ListItemButton key={userId} onClick={() => onSelect(userId)}>
                <Checkbox
                  edge="start"
                  checked={checked}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemText
                  primary={getBuddyName(buddy)}
                  secondary={getBuddyEmail(buddy)}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            );
          })}
        </List>
        {members.length === 0 && (
          <Typography color="text.secondary" variant="body2">
            Everyone available is already in this group.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onAdd}
          disabled={adding || members.length === 0}
        >
          {adding ? "Adding" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
