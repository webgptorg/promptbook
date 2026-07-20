/**
 * Constant for loading interactive image.
 *
 * @deprecated use `isComplete` instead
 *
 * @private util of `<Chat />`
 */
export const LOADING_INTERACTIVE_IMAGE = 'Loading...';

/**
 * [🚉] Avatar dimensions constant to prevent layout jumps and maintain DRY principle
 *
 * @deprecated use `isComplete` instead
 *
 * @private util of `<Chat />`
 */
export const AVATAR_SIZE = 40;

/**
 * Glyph used to render one rating star across the chat feedback UI.
 *
 * Note: A text-presentation star (`★`, U+2605) is used intentionally instead of the
 * color-presentation emoji (`⭐`, U+2B50). Color emojis are painted by the platform emoji
 * font and ignore the CSS `color` property, so picked/unpicked stars could not be visually
 * distinguished. The text star respects `color`, letting active stars render gold and
 * inactive stars render grey.
 *
 * @private util of `<Chat />`
 */
export const RATING_STAR_SYMBOL = '★';

// Note: [💞] Ignore a discrepancy between file name and entity name
