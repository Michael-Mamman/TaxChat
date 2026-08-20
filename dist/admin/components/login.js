import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Box, Button, FormGroup, Input, Label, MessageBox, Text } from "@adminjs/design-system";
import Logo from "./logo.js";
const Login = () => {
    const { action, errorMessage } = (window.__APP_STATE__ ?? { action: "" });
    return (_jsxs(Box, { flex: true, variant: "grey", style: {
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
        }, children: [_jsxs(Box, { as: "form", action: action, method: "POST", bg: "container", color: "text", p: "x3", border: "1px solid", borderColor: "border", style: { borderRadius: "10px", width: "100%", maxWidth: "420px" }, children: [_jsx(Box, { mb: "xxl", style: { display: "flex", justifyContent: "center" }, children: _jsx(Logo, { width: 210 }) }), _jsx(Text, { color: "grey60", mb: "xl", textAlign: "center", style: { fontSize: "13px" }, children: "Virtual Tax Office \u2014 Administration" }), errorMessage ? _jsx(MessageBox, { my: "lg", message: errorMessage, variant: "danger" }) : null, _jsxs(FormGroup, { children: [_jsx(Label, { required: true, children: "Email" }), _jsx(Input, { name: "email", placeholder: "you@nrstaxchat.gov.ng", width: "100%", autoFocus: true })] }), _jsxs(FormGroup, { children: [_jsx(Label, { required: true, children: "Password" }), _jsx(Input, { type: "password", name: "password", placeholder: "Password", autoComplete: "current-password", width: "100%" })] }), _jsx(Box, { mt: "xl", children: _jsx(Button, { variant: "contained", type: "submit", style: { width: "100%" }, children: "Sign in" }) })] }), _jsx(Text, { color: "grey60", mt: "xl", style: { fontSize: "12px" }, children: "Nigeria Revenue Service" })] }));
};
export default Login;
