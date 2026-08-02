import "server-only";
import type { ActivityAction } from "@prisma/client";

/**
 * Human-readable labels for audit log entries.
 *
 * Kept as an exhaustive Record so adding an ActivityAction to the schema
 * fails the build here until it's given a label.
 */
const ACTION_LABELS: Record<ActivityAction, string> = {
  USER_SIGNED_UP: "joined InsightHub AI",
  USER_SIGNED_IN: "signed in",
  PROJECT_CREATED: "created project",
  PROJECT_UPDATED: "updated project",
  PROJECT_DELETED: "deleted project",
  MEMBER_INVITED: "invited a member to",
  MEMBER_REMOVED: "removed a member from",
  MEMBER_ROLE_CHANGED: "changed a member role in",
  DATASET_UPLOADED: "uploaded dataset",
  DATASET_UPDATED: "updated dataset",
  DATASET_CLEANED: "cleaned dataset",
  DATASET_VERSION_RESTORED: "restored a version of dataset",
  DATASET_DELETED: "deleted dataset",
  DATASET_EXPORTED: "exported dataset",
  REPORT_GENERATED: "generated report",
  REPORT_DELETED: "deleted report",
  CHART_CREATED: "created chart",
  CHART_DELETED: "deleted chart",
  QUERY_SAVED: "saved query",
  QUERY_EXECUTED: "ran query",
  API_KEY_CREATED: "created an API key",
  API_KEY_REVOKED: "revoked an API key",
  SETTINGS_UPDATED: "updated settings",
};

export function activityLabel(action: ActivityAction): string {
  return ACTION_LABELS[action];
}

/** Pulls a display name out of an activity log's free-form metadata. */
export function activityTarget(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const name = (metadata as Record<string, unknown>).entityName;
  return typeof name === "string" && name.length > 0 ? name : null;
}
