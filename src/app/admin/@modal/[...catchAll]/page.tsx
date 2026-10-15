// Like the admin pages, this slot renders on the server as a whole; it holds nothing to wait for.
export const instant = false;

/**
 * Closes the request panel when navigating to any other admin page. Without a match the
 * panel would stay open, because a parallel route keeps its last page on client navigation.
 */
export default function NoPanel() {
  return null;
}
