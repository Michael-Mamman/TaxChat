import React from "react";
import { Box, Text } from "@adminjs/design-system";

/** Charts on a fresh deployment routinely have nothing to draw - say so. */
const Empty: React.FC<{ height: number; message?: string }> = ({ height, message }) => (
  <Box
    style={{ height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    <Text color="grey60" style={{ fontSize: "13px" }}>
      {message ?? "No data yet"}
    </Text>
  </Box>
);

export default Empty;
