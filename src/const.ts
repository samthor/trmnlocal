/**
 * We render the image when TRMNL asks for an update, but it calls us back later to fetch the image.
 *
 * Keep the image for this long.
 */
export const IMAGE_CACHE_SECONDS = 10;

/**
 * Enforce a minimum refresh time even if the user specifies less.
 */
export const REFRESH_SAFE_SECONDS = 10;
