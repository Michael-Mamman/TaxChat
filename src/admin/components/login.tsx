import React from "react";
import { Box, Button, FormGroup, Input, Label, MessageBox, Text } from "@adminjs/design-system";
import Logo from "./logo.js";

/**
 * Replaces the stock AdminJS login, which ships the vendor's illustrations and
 * a "the world's leading open-source admin panel" strapline. The form contract
 * is the part that matters: POST to `action` with `email` and `password`.
 */
type LoginState = { action: string; errorMessage?: string };

const Login: React.FC = () => {
  const { action, errorMessage } = ((window as unknown as {
    __APP_STATE__: LoginState;
  }).__APP_STATE__ ?? { action: "" }) as LoginState;

  return (
    <Box
      flex
      variant="grey"
      style={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Box
        as="form"
        action={action}
        method="POST"
        bg="container"
        color="text"
        p="x3"
        border="1px solid"
        borderColor="border"
        style={{ borderRadius: "10px", width: "100%", maxWidth: "420px" }}
      >
        <Box mb="xxl" style={{ display: "flex", justifyContent: "center" }}>
          <Logo width={210} />
        </Box>
        <Text color="grey60" mb="xl" textAlign="center" style={{ fontSize: "13px" }}>
          Virtual Tax Office — Administration
        </Text>

        {errorMessage ? <MessageBox my="lg" message={errorMessage} variant="danger" /> : null}

        <FormGroup>
          <Label required>Email</Label>
          <Input name="email" placeholder="you@nrstaxchat.gov.ng" width="100%" autoFocus />
        </FormGroup>
        <FormGroup>
          <Label required>Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            width="100%"
          />
        </FormGroup>

        <Box mt="xl">
          <Button variant="contained" type="submit" style={{ width: "100%" }}>
            Sign in
          </Button>
        </Box>
      </Box>

      <Text color="grey60" mt="xl" style={{ fontSize: "12px" }}>
        Nigeria Revenue Service
      </Text>
    </Box>
  );
};

export default Login;
