import type { PropertyOptions } from "adminjs";

/**
 * AuthTier is a numeric enum, so mongoose only gives AdminJS the raw values.
 * Spell out the labels or the UI just renders "0", "1", "2", "3".
 */
export const AUTH_TIER_VALUES = [
  { value: 0, label: "Tier 0 - Unauthenticated" },
  { value: 1, label: "Tier 1 - TIN + OTP" },
  { value: 2, label: "Tier 2 - TIN + OTP + NIN/BVN" },
  { value: 3, label: "Tier 3 - Full KYC" },
];

/** Mongoose owns createdAt/updatedAt - surface them but never let an admin type into them. */
export const readOnly: PropertyOptions = {
  isVisible: { list: false, filter: false, show: true, edit: false },
};

export const readOnlyListed: PropertyOptions = {
  isVisible: { list: true, filter: true, show: true, edit: false },
};

/** PII we keep out of list views and filters, but still editable on a single record. */
export const sensitive: PropertyOptions = {
  isVisible: { list: false, filter: false, show: true, edit: true },
};

/** Mixed/blob fields that are useful to read but noisy in a table. */
export const detailOnly: PropertyOptions = {
  isVisible: { list: false, filter: false, show: true, edit: true },
};

export const timestampProps = {
  createdAt: readOnlyListed,
  updatedAt: readOnly,
};
