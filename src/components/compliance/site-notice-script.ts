/** Session key for the dismissed site notice (shared by the notice and its script that runs before first paint). */
export const SITE_NOTICE_KEY = "cv_notice_dismissed";

/**
 * Inline script that runs before first paint (rendered by the site layout): hides the notice for
 * visitors who dismissed it this session. Lives outside the "use client" notice module so the
 * server layout receives the string itself, not a client reference.
 */
export const SITE_NOTICE_SCRIPT = `try{if(sessionStorage.getItem("${SITE_NOTICE_KEY}")==="1")document.documentElement.setAttribute("data-notice-dismissed","")}catch(e){}`;
