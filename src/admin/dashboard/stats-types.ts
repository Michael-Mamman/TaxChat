/**
 * Types only - imported with `import type` on both sides so the browser bundle
 * never pulls the mongoose aggregation code in.
 */
export type Slice = { label: string; value: number };
export type DayPoint = { date: string; value: number };

export type RecentRequest = {
  id: string;
  reference: string;
  type: string;
  status: string;
  phone: string;
  createdAt: string;
};

export type DashboardStats = {
  taxpayers: number;
  verifiedTaxpayers: number;
  openRequests: number;
  totalRequests: number;
  activeSessions: number;
  pendingNotifications: number;
  escalatedConversations: number;
  auditEvents: number;
  activityByDay: DayPoint[];
  requestsByStatus: Slice[];
  requestsByType: Slice[];
  taxpayersByTier: Slice[];
  notificationsByStatus: Slice[];
  recentRequests: RecentRequest[];
};
