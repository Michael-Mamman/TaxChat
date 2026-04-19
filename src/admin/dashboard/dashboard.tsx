import React from "react";
import { Box, H2, Text } from "@adminjs/design-system";

const Dashboard = () => {
  return (
    <Box variant="grey">
      <Box variant="white" p="xl" m="xl" style={{ borderRadius: "8px" }}>
        <H2>NRS TaxChat Admin</H2>
        <Text mt="default">
          Welcome to the NRS TaxChat administration panel. Use the sidebar to
          manage taxpayers, service requests, notifications, and audit logs.
        </Text>
      </Box>
    </Box>
  );
};

export default Dashboard;
