/** Main app sidebar widths */

export const SIDEBAR_WIDTH_EXPANDED = 260;

export const SIDEBAR_WIDTH_COLLAPSED = 260;



/** Collapse button is 32px wide and sits half outside the sidebar (translate-x-1/2) */

export const SIDEBAR_TOGGLE_HALF_WIDTH = 16;

export const SIDEBAR_TOGGLE_GAP = 12;



/** Fixed header block above page content */

export const APP_HEADER_HEIGHT = 64;

export const APP_HEADER_HEIGHT_WITH_SUBTITLE = 80;



/** Sidebar element width (animated) */

export function getSidebarWidth(sidebarOpen) {

  return sidebarOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

}



/**

 * Main outlet left offset — when collapsed, extends past the sidebar so the

 * title and content clear the circular toggle on the sidebar edge.

 */

export function getMainContentOffset(sidebarOpen) {

  if (sidebarOpen) return SIDEBAR_WIDTH_EXPANDED;

  return SIDEBAR_WIDTH_COLLAPSED + SIDEBAR_TOGGLE_HALF_WIDTH + SIDEBAR_TOGGLE_GAP;

}



/** Shared horizontal gutter for header + page content */

export const CONTENT_PADDING_CLASS = 'px-6';

/** Same max-width column for page title and body — keeps left edges aligned */

export const CONTENT_INNER_CLASS = 'w-full max-w-7xl mx-auto';

/** Bottom breathing room for full-viewport pages (e.g. Start Interview) */
export const VIEWPORT_PAGE_BOTTOM_PADDING = 'pb-5';

