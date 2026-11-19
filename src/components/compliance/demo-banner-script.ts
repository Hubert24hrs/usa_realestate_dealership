/** Session key for the dismissed demo banner (shared by the banner and its pre-paint script). */
export const DEMO_BANNER_KEY = "cv_demo_banner_dismissed";

/**
 * Inline script that runs before first paint (rendered by the site layout): hides the banner for
 * visitors who dismissed it this session. Lives outside the "use client" banner module so the
 * server layout receives the string itself, not a client reference.
 */
export const DEMO_BANNER_SCRIPT = `try{if(sessionStorage.getItem("${DEMO_BANNER_KEY}")==="1")document.documentElement.setAttribute("data-demo-dismissed","")}catch(e){}`;
