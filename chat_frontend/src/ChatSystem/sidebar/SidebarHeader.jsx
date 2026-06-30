import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import PinglyMark from "../PinglyMark";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";

const SidebarHeader = ({
  loading,
  onCreateGroup,
  onRefresh,
  onSettingsOpen,
}) => {
  return (
    <Box
      px={1.5}
      py={1.25}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      borderBottom="1px solid #edf0f4"
      bgcolor="#ffffff"
    >
      <Box display="flex" alignItems="center" gap={1} minWidth={0}>
        <Tooltip title="Back">
          <IconButton size="small" onClick={() => window.history.back()}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box minWidth={0}>
          <PinglyMark size={30} showWord />
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={0.25}>
        <Tooltip title="Create group">
          <IconButton size="small" onClick={onCreateGroup}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton size="small" onClick={onSettingsOpen}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SidebarHeader;
