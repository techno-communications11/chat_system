import { Box, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function SearchBox({ searchTerm, setSearchTerm }) {
  return (
    <Box px={1.5} py={1.25} sx={{ bgcolor: "var(--chat-canvas)" }}>
      <TextField
        fullWidth
        placeholder="Search chats"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "#7b8494" }} /> }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "var(--chat-soft)",
            borderRadius: 2.5,
            "& fieldset": { border: 0 },
            "&:hover fieldset": { border: 0 },
            "&.Mui-focused fieldset": { border: 0 },
            fontSize: 14,
          },
        }}
      />
    </Box>
  );
}
