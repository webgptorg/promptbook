import type { string_char_emoji } from '../types/typeAliasEmoji';
/**
 * All possible emoji chars like "🍆", "🍡", "🍤"...
 * Note: this will be needed to update annually - now updated at 2022-01-19
 *
 * @see https://getemoji.com/
 *
 * @private within the repository
 * @deprecated Use /\p{Extended_Pictographic}/ instead
 */
export declare const EMOJIS_IN_CATEGORIES: Record<string, Array<string_char_emoji>>;
/**
 *
 * All possible emoji chars like "🍆", "🍡", "🍤"...
 *
 * @private within the repository
 * @deprecated Use /\p{Extended_Pictographic}/ instead
 */
export declare const EMOJIS: Set<string_char_emoji>;
/**
 * TODO: [💴] DRY - just one version of emojis.ts
 * TODO: Mirror from Collboard or some common package
 */
