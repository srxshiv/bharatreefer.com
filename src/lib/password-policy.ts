// Kept apart from password.ts so forms in the browser can read the limits without
// pulling in the server-side hashing code.

export const PASSWORD_MIN_LENGTH = 8;
/** Upper bound so a huge input cannot be used to tie up the hash function. */
export const PASSWORD_MAX_LENGTH = 128;
