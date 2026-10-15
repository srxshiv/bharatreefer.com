/** Where the visitor's choice of theme is kept, in this browser only. */
// Renamed when the default changed, so a choice saved while dark was the default does not
// override the new light default.
export const THEME_KEY = "bharat-reefer-color-theme";
export const DEFAULT_THEME = "light";

/** The browser's toolbar colour for each theme (the page background). */
export const THEME_COLORS = { dark: "#011f45", light: "#f4f7fb" } as const;

/**
 * Runs in <head> before the page paints, so a visitor who chose the dark theme never sees
 * a flash of the light one. The page is served light; this only switches it when needed.
 *
 * It also handles every theme button (marked `data-theme-toggle`), so the button works the
 * moment the page shows, without waiting for React to load: on a slow connection, or while
 * the development server is still compiling, a React click handler would not be attached yet.
 */
export const THEME_SCRIPT = `(function(){var K=${JSON.stringify(THEME_KEY)},C=${JSON.stringify(THEME_COLORS)},d=document;function a(t){d.documentElement.dataset.theme=t;var m=d.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",C[t]);}try{var t=localStorage.getItem(K);if(t==="light"||t==="dark")a(t);}catch(e){}d.addEventListener("click",function(e){var b=e.target&&e.target.closest&&e.target.closest("[data-theme-toggle]");if(!b)return;var n=d.documentElement.dataset.theme==="dark"?"light":"dark";a(n);try{localStorage.setItem(K,n);}catch(e){}});})();`;
