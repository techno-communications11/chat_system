import { Box, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function SearchBox({ searchTerm, setSearchTerm }) {
  return (
    <Box p={1.5} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
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
            bgcolor: "action.hover",
            borderRadius: 1,
            fontSize: 14,
          },
        }}
      />
    </Box>
  );
}
