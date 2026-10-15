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
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?${JSON.stringify(THEME_COLORS.light)}:${JSON.stringify(THEME_COLORS.dark)});}}catch(e){}})();`;
