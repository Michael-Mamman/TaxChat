import Session from "../../models/session.model.js";
import { NAV } from "../navigation.js";
import { AUTH_TIER_VALUES, readOnly, readOnlyListed } from "./shared.js";
console.log("[session.resource::module] ENTER", { loading: true });
const SessionResource = {
    resource: Session,
    options: {
        navigation: NAV.ACCESS,
        listProperties: ["phone", "tin", "auth_tier", "is_active", "expires_at", "last_activity"],
        filterProperties: [
            "phone",
            "tin",
            "auth_tier",
            "is_active",
            "otp_verified",
            "identity_verified",
            "kyc_verified",
            "expires_at",
            "createdAt",
        ],
        editProperties: [
            "phone",
            "tin",
            "auth_tier",
            "is_active",
            "otp_verified",
            "identity_verified",
            "kyc_verified",
            "expires_at",
            "last_activity",
        ],
        sort: { sortBy: "last_activity", direction: "desc" },
        properties: {
            auth_tier: { availableValues: AUTH_TIER_VALUES },
            createdAt: readOnlyListed,
            updatedAt: readOnly,
        },
    },
};
console.log("[session.resource::module] EXIT", { navigation: NAV.ACCESS.name });
export default SessionResource;
