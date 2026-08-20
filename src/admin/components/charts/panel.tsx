import React from "react";
import { Box, Text } from "@adminjs/design-system";

const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <Box
    bg="container"
    color="text"
    p="xl"
    border="1px solid"
    borderColor="border"
    style={{ borderRadius: "10px", minWidth: 0 }}
  >
    <Text color="text" style={{ fontSize: "14px", fontWeight: 600 }}>
      {title}
    </Text>
    {subtitle ? (
      <Text color="grey60" style={{ fontSize: "12px", marginTop: "2px" }}>
        {subtitle}
      </Text>
    ) : null}
    <Box mt="lg">{children}</Box>
  </Box>
);

export default Panel;
