import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const sortNotes = (notes) => [...notes].sort((first, second) => {
  if (!first.reminderAt && !second.reminderAt) return new Date(second.updatedAt) - new Date(first.updatedAt);
  if (!first.reminderAt) return 1;
  if (!second.reminderAt) return -1;
  return new Date(first.reminderAt) - new Date(second.reminderAt);
});

export default function NotesDialog({ notes, onClose, onDelete, onSave, open, page = false }) {
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setTitle("");
    setBody("");
    setReminderAt("");
    setEditorOpen(false);
  }, [open]);

  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setReminderAt("");
  };

  const editNote = (note) => {
    setEditingId(note.id);
    setTitle(note.title || "");
    setBody(note.body || "");
    setReminderAt(toDateTimeLocal(note.reminderAt));
    if (page) setEditorOpen(true);
  };

  const saveNote = () => {
    if (!title.trim() && !body.trim()) return;
    onSave({ id: editingId, title, body, reminderAt });
    resetEditor();
    if (page) setEditorOpen(false);
  };

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
              bgcolor: "var(--chat-canvas)",
              border: 0,
              boxShadow: "none",
            }
          : { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 2.25 }}>
        <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "warning.light", color: "warning.dark" }}>
          <StickyNote2OutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={750}>My notes</Typography>
          <Typography variant="caption" color="text.secondary">Private reminders and quick thoughts</Typography>
        </Box>
        {page && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetEditor();
              setEditorOpen(true);
            }}
            sx={{ ml: "auto", borderRadius: 2, fontWeight: 700 }}
          >
            Add note
          </Button>
        )}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2.25 }}>
        <Stack spacing={1.5} sx={{ display: page ? "none" : "flex" }}>
          <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you need to remember?" fullWidth />
          <TextField label="Note" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add details…" multiline minRows={3} fullWidth />
          <TextField
            label="Reminder"
            type="datetime-local"
            value={reminderAt}
            onChange={(event) => setReminderAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            InputProps={{ startAdornment: <NotificationsNoneIcon fontSize="small" color="action" sx={{ mr: 1 }} /> }}
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            {editingId && <Button onClick={resetEditor} sx={{ textTransform: "none" }}>Cancel edit</Button>}
            <Button variant="contained" onClick={saveNote} startIcon={<AddIcon />} disabled={!title.trim() && !body.trim()} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, boxShadow: "none" }}>
              {editingId ? "Save changes" : "Add note"}
            </Button>
          </Stack>
        </Stack>
        <Dialog open={page && editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>{editingId ? "Edit note" : "Add note"}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What do you need to remember?" fullWidth autoFocus />
              <TextField label="Note" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add details…" multiline minRows={3} fullWidth />
              <TextField label="Reminder" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth InputProps={{ startAdornment: <NotificationsNoneIcon fontSize="small" color="action" sx={{ mr: 1 }} /> }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveNote} disabled={!title.trim() && !body.trim()}>
              {editingId ? "Save changes" : "Add note"}
            </Button>
          </DialogActions>
        </Dialog>
        <Divider sx={{ my: 2.25 }} />
        {notes.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <StickyNote2OutlinedIcon color="disabled" sx={{ fontSize: 34 }} />
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>No notes yet. Add one above.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {sortNotes(notes).map((note) => (
              <ListItem key={note.id} divider disableGutters secondaryAction={
                <Stack direction="row">
                  <IconButton edge="end" aria-label="Edit note" onClick={() => editNote(note)}><EditOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton edge="end" aria-label="Delete note" onClick={() => onDelete(note.id)} color="error"><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
              } sx={{ py: 1.25, pr: 9 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>{note.title || "Untitled note"}</Typography>
                  {note.body && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, whiteSpace: "pre-wrap" }}>{note.body}</Typography>}
                  {note.reminderAt && <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.75 }}>{new Date(note.reminderAt).toLocaleString()}</Typography>}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      {!page && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 700 }}>
            Done
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
