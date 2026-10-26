// Like the admin pages, this slot renders on the server as a whole; it holds nothing to wait for.
export const instant = false;

/** Closes the request panel when navigating to the requests page. */
export default function NoPanel() {
  return null;
}
