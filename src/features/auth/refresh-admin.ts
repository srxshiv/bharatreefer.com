import "server-only";
import { refresh, updateTag } from "next/cache";
import { ADMIN_DATA_TAG } from "./session";

/**
 * Call from a Server Action after it changes admin data. Expires the privately cached reads
 * so the refreshed page shows the change, and clears the pages the browser kept or prefetched.
 */
export function refreshAdminData() {
  updateTag(ADMIN_DATA_TAG);
  refresh();
}
