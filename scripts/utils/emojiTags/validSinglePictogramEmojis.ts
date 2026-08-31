import type { string_char_emoji } from '../../../src/types/typeAliasEmoji';
import { EMOJIS } from '../../../src/utils/misc/emojis';

/**
 * Matches one Unicode code point that has default emoji presentation.
 *
 * @private internal utility of generated `ptbk` emoji tags
 */
const SINGLE_PICTOGRAM_EMOJI_PATTERN = /^\p{Emoji_Presentation}$/u;

/**
 * Valid single-pictogram emojis that `ptbk` can use in generated tags.
 *
 * The shared emoji catalogue also contains legacy symbols for other presentation
 * purposes. Restricting generated tags to Unicode emoji-presentation pictograms
 * prevents those symbols from being emitted as prompt identifiers.
 *
 * @private internal utility of generated `ptbk` emoji tags
 */
export const VALID_SINGLE_PICTOGRAM_EMOJIS: ReadonlySet<string_char_emoji> = new Set(
    Array.from(EMOJIS).filter(isValidSinglePictogramEmoji),
);

/**
 * Determines whether one catalogue entry is a valid single-pictogram emoji for a generated tag.
 *
 * @private internal utility of generated `ptbk` emoji tags
 */
export function isValidSinglePictogramEmoji(emoji: string_char_emoji): boolean {
    return SINGLE_PICTOGRAM_EMOJI_PATTERN.test(emoji);
}

// Note: [🟡] Code for generated emoji tags should never be published outside of `@promptbook/cli`
