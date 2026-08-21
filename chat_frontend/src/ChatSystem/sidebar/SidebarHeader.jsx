import { Box } from "@mui/material";
import PinglyMark from "../PinglyMark";

const SidebarHeader = () => {
  return (
    <Box
      px={1.5}
      py={1.25}
      display="flex"
      alignItems="center"
      justifyContent="center"
      borderBottom="0"
      bgcolor="var(--chat-canvas)"
    >
      <Box minWidth={0}>
        <PinglyMark size={30} showWord />
      </Box>
    </Box>
  );
};

export default SidebarHeader;
