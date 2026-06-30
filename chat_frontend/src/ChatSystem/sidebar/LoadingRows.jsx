import { Box, Skeleton } from "@mui/material";

export default function LoadingRows() {
  return Array.from(new Array(6)).map((_, index) => (
    <Box
      key={index}
      sx={{
        display: "flex",
        gap: 1.5,
        alignItems: "center",
        px: 1,
        py: 1.25,
        mb: 0.5,
      }}
    >
      <Skeleton variant="circular" width={42} height={42} />
      <Box flex={1}>
        <Skeleton width="55%" />
      </Box>
    </Box>
  ));
}
