import { useMemo } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import LinkIcon from "@mui/icons-material/Link";
import { getMessageAttachments } from "../chatHelpers";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

export default function ConversationMediaDialog({ messages = [], onClose, open }) {
  const { files, links } = useMemo(() => {
    const fileItems = [];
    const linkItems = [];

    messages.forEach((message) => {
      getMessageAttachments(message).forEach((file) => fileItems.push({ ...file, message }));
      String(message.text || "").match(URL_PATTERN)?.forEach((value) => {
        const cleanUrl = value.replace(/[),.!?:;]+$/, "");
        if (!linkItems.some((item) => item.url === cleanUrl)) {
          linkItems.push({ url: cleanUrl, message });
        }
      });
    });

    return { files: fileItems, links: linkItems };
  }, [messages]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Media, links & files</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box px={2} pt={1.5}>
          <Typography variant="caption" fontWeight={800} color="text.secondary">LINKS</Typography>
        </Box>
        <List dense disablePadding>
          {links.map(({ url, message }) => (
            <ListItemButton key={url} component="a" href={url.startsWith("www.") ? `https://${url}` : url} target="_blank" rel="noopener noreferrer">
              <LinkIcon color="primary" sx={{ mr: 1.25 }} />
              <ListItemText primary={url} secondary={message.timestamp || ""} primaryTypographyProps={{ noWrap: true }} />
            </ListItemButton>
          ))}
          {links.length === 0 && <Typography color="text.secondary" variant="body2" sx={{ px: 2, py: 1 }}>No links shared in this conversation.</Typography>}
        </List>
        <Divider sx={{ my: 1 }} />
        <Box px={2} pt={0.5}>
          <Typography variant="caption" fontWeight={800} color="text.secondary">FILES</Typography>
        </Box>
        <List dense disablePadding sx={{ pb: 1 }}>
          {files.map((file) => (
            <ListItemButton key={`${file.message.id}-${file.id}`} component={file.url ? "a" : "div"} href={file.url || undefined} target={file.url ? "_blank" : undefined} rel={file.url ? "noopener noreferrer" : undefined}>
              <AttachFileIcon color="primary" sx={{ mr: 1.25 }} />
              <ListItemText primary={file.name || "Attachment"} secondary={file.contentType || "File"} primaryTypographyProps={{ noWrap: true }} />
            </ListItemButton>
          ))}
          {files.length === 0 && <Typography color="text.secondary" variant="body2" sx={{ px: 2, py: 1 }}>No files shared in this conversation.</Typography>}
        </List>
      </DialogContent>
    </Dialog>
  );
}
