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
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box display="flex" alignItems="center" gap={1.25}>
          <Avatar sx={{ bgcolor: "primary.main", width: 42, height: 42 }}>
            <GroupIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              New group
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add people and choose a group name
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
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 2, mb: 0.75, fontWeight: 700 }}
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
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
        <List sx={{ maxHeight: 310, overflow: "auto", mt: 1, p: 0 }}>
          {members.map((buddy) => {
            const userId = String(getBuddySendId(buddy));
            const checked = selectedMembers.some(
              (member) => String(getBuddySendId(member)) === userId,
            );
            return (
              <ListItemButton
                key={userId}
                onClick={() => onSelectMember(userId)}
                sx={{ borderRadius: 2, mb: 0.25, px: 1 }}
              >
                <Avatar
                  src={getImageUrl(buddy)}
                  sx={{ width: 42, height: 42, mr: 1.25 }}
                >
                  {getInitial(getBuddyName(buddy))}
                </Avatar>
                <ListItemText
                  primary={getBuddyName(buddy)}
                  secondary={getBuddyEmail(buddy)}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                <Checkbox checked={checked} tabIndex={-1} disableRipple />
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
          disabled={creating || selectedMembers.length === 0}
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
