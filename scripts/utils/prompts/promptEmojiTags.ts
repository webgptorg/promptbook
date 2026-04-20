import type { string_char_emoji } from '../../../src/types/typeAliasEmoji';
import { $shuffleItems } from '../../find-fresh-emoji-tags/utils/$shuffleItems';
import { EMOJIS_OF_SINGLE_PICTOGRAM } from '../../find-fresh-emoji-tags/utils/emojis';
import { scanEmojiTagUsage } from '../emojiTags/scanEmojiTagUsage';

/**
 * Emoji prefix used for prompt tags (e.g. `[prefix + emoji]`).
 */
export const PROMPT_EMOJI_TAG_PREFIX = '\u2728';

/**
 * Options for selecting fresh prompt emoji tags.
 */
export type PromptEmojiTagOptions = {
    /**
     * Number of unique emojis to reserve.
     */
    readonly count: number;
    /**
     * Root directory to scan (defaults to `process.cwd()`).
     */
    readonly rootDir?: string;
    /**
     * Glob patterns to include when scanning for existing tags.
     */
    readonly includeGlobs?: ReadonlyArray<string>;
    /**
     * Glob patterns to ignore when scanning for existing tags.
     */
    readonly ignoreGlobs?: ReadonlyArray<string>;
    /**
     * Emoji prefix placed before the unique emoji tag.
     */
    readonly tagPrefix?: string;
};

/**
 * Result payload for fresh prompt emoji tag selection.
 */
export type PromptEmojiTagSelection = {
    /**
     * Total number of emojis still available for tagging.
     */
    readonly availableCount: number;
    /**
     * Selected emojis that are not used anywhere in the repo.
     */
    readonly selectedEmojis: ReadonlyArray<string_char_emoji>;
    /**
     * Emoji prefix applied to tags.
     */
    readonly tagPrefix: string;
};

/**
 * Builds a prompt emoji tag with the configured prefix.
 */
export function formatPromptEmojiTag(emoji: string_char_emoji, tagPrefix: string = PROMPT_EMOJI_TAG_PREFIX): string {
    return `[${tagPrefix}${emoji}]`;
}

/**
 * Selects fresh emoji tags that are not present anywhere in the repository.
 */
export async function getFreshPromptEmojiTags(options: PromptEmojiTagOptions): Promise<PromptEmojiTagSelection> {
    const count = Math.floor(options.count);
    if (!Number.isFinite(count) || count < 0) {
        throw new Error(`Prompt emoji tag count must be a non-negative number. Received: ${options.count}`);
    }

    const rootDir = options.rootDir ?? process.cwd();
    const includeGlobs = options.includeGlobs ?? ['**/*.{ts,tsx,js,jsx,json,md,txt}'];
    const ignoreGlobs = options.ignoreGlobs ?? ['**/node_modules/**'];
    const tagPrefix = options.tagPrefix ?? PROMPT_EMOJI_TAG_PREFIX;

    const { usedEmojis } = await scanEmojiTagUsage({
        rootDir,
        includeGlobs,
        ignoreGlobs,
        tagPrefix,
        candidateEmojis: EMOJIS_OF_SINGLE_PICTOGRAM,
    });
    const freshEmojis = new Set(
        Array.from(EMOJIS_OF_SINGLE_PICTOGRAM).filter((emoji) => !usedEmojis.has(emoji)),
    );
    const shuffledEmojis = $shuffleItems(...Array.from(freshEmojis));
    const selectedEmojis = shuffledEmojis.slice(0, count);

    if (selectedEmojis.length < count) {
        throw new Error(`Not enough fresh prompt emojis available. Needed ${count}, found ${selectedEmojis.length}.`);
    }

    return {
        availableCount: freshEmojis.size,
        selectedEmojis,
        tagPrefix,
    };
}

// Note: [?] Code in this file should never be published in any package
