import type { ResourceWithOptions } from "adminjs";
import OTP from "../../models/otp.model.js";
import { NAV } from "../navigation.js";
import { readOnlyListed, sensitive } from "./shared.js";

console.log("[otp.resource::module] ENTER", { loading: true });

const OTPResource: ResourceWithOptions = {
  resource: OTP,
  options: {
    navigation: NAV.ACCESS,
    listProperties: ["phone", "purpose", "attempts", "is_used", "expires_at", "createdAt"],
    filterProperties: ["phone", "purpose", "is_used", "expires_at", "createdAt"],
    sort: { sortBy: "createdAt", direction: "desc" },
    properties: {
      // The live code never belongs in a table; it stays on the record page only.
      code: sensitive,
      createdAt: readOnlyListed,
    },
    actions: {
      // Hand-writing an OTP code for a phone number is an auth bypass, so this
      // resource is read + revoke (delete) only. Flip these to re-enable.
      new: { isAccessible: false },
      edit: { isAccessible: false },
    },
  },
};

console.log("[otp.resource::module] EXIT", { navigation: NAV.ACCESS.name });

export default OTPResource;
