/**
 * Sidebar groupings for the admin panel. Keeping them in one place stops the
 * resource files from drifting apart on naming.
 */
export const NAV = {
  TAXPAYERS: { name: "Taxpayers", icon: "Users" },
  ACCESS: { name: "Auth & Access", icon: "Shield" },
  OPERATIONS: { name: "Service Delivery", icon: "Briefcase" },
  MESSAGING: { name: "Messaging", icon: "MessageSquare" },
  SYSTEM: { name: "System", icon: "Settings" },
} as const;
