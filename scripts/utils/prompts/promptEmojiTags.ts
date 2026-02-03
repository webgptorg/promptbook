import { readFileSync } from 'fs';
import glob from 'glob-promise';
import type { string_char_emoji } from '../../../src/types/typeAliasEmoji';
import { difference } from '../../../src/utils/sets/difference';
import { $shuffleItems } from '../../find-fresh-emoji-tag/utils/$shuffleItems';
import { EMOJIS_OF_SINGLE_PICTOGRAM } from '../../find-fresh-emoji-tag/utils/emojis';

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
export function formatPromptEmojiTag(
    emoji: string_char_emoji,
    tagPrefix: string = PROMPT_EMOJI_TAG_PREFIX,
): string {
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

    const filesToScan = await findFilesToScan(rootDir, includeGlobs, ignoreGlobs);
    const usedEmojis = collectUsedPromptEmojis(filesToScan, tagPrefix);
    const freshEmojis = difference(EMOJIS_OF_SINGLE_PICTOGRAM, usedEmojis);
    const shuffledEmojis = $shuffleItems(...Array.from(freshEmojis));
    const selectedEmojis = shuffledEmojis.slice(0, count);

    if (selectedEmojis.length < count) {
        throw new Error(
            `Not enough fresh prompt emojis available. Needed ${count}, found ${selectedEmojis.length}.`,
        );
    }

    return {
        availableCount: freshEmojis.size,
        selectedEmojis,
        tagPrefix,
    };
}

/**
 * Resolves files to scan for existing prompt emoji tags.
 */
async function findFilesToScan(
    rootDir: string,
    includeGlobs: ReadonlyArray<string>,
    ignoreGlobs: ReadonlyArray<string>,
): Promise<ReadonlyArray<string>> {
    const files = new Set<string>();

    for (const pattern of includeGlobs) {
        const matches = await glob(pattern, {
            cwd: rootDir,
            ignore: ignoreGlobs,
            nodir: true,
            absolute: true,
        });

        for (const match of matches) {
            files.add(match);
        }
    }

    return Array.from(files);
}

/**
 * Collects emojis already used with the configured prompt prefix.
 */
function collectUsedPromptEmojis(filePaths: ReadonlyArray<string>, tagPrefix: string): Set<string_char_emoji> {
    const usedEmojis = new Set<string_char_emoji>();

    for (const file of filePaths) {
        const content = readFileSync(file, 'utf-8'); /* Note: sync read is fine for script tooling. */
        for (const emoji of EMOJIS_OF_SINGLE_PICTOGRAM) {
            const tag = formatPromptEmojiTag(emoji, tagPrefix);
            if (content.includes(tag)) {
                usedEmojis.add(emoji);
            }
        }
    }

    return usedEmojis;
}

/**
 * Note: [?] Code in this file should never be published in any package
 */
