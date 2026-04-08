import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { normalizeToKebabCase } from '../../src/_packages/utils.index';
import { buildPromptFilename, getPromptNumbering } from '../utils/prompts/getPromptNumbering';
import { formatPromptEmojiTag, getFreshPromptEmojiTags } from '../utils/prompts/promptEmojiTags';
import {
    PROMPT_NUMBER_STEP,
    PROMPT_SLUG_MAX_LENGTH,
    PROMPT_SLUG_PREFIX,
} from './find-refactor-candidates.constants';
import type { RefactorCandidate } from './RefactorCandidate';
import { buildPromptContent } from './buildPromptContent';

/**
 * Input required to create prompt files for refactor candidates.
 *
 * @private type of findRefactorCandidates
 */
export type WriteRefactorCandidatePromptsOptions = {
    /**
     * Candidates that still need prompt files.
     */
    readonly candidates: ReadonlyArray<RefactorCandidate>;

    /**
     * Repository root used for fresh emoji scanning.
     */
    readonly rootDir: string;

    /**
     * Prompts directory where files should be written.
     */
    readonly promptsDir: string;
};

/**
 * Creates prompt files for each refactor candidate and returns written filenames.
 *
 * @private function of findRefactorCandidates
 */
export async function writeRefactorCandidatePrompts(
    options: WriteRefactorCandidatePromptsOptions,
): Promise<ReadonlyArray<string>> {
    const { candidates, promptsDir, rootDir } = options;
    const promptNumbering = await getPromptNumbering({
        promptsDir,
        step: PROMPT_NUMBER_STEP,
        ignoreGlobs: ['**/node_modules/**'],
    });
    const { selectedEmojis } = await getFreshPromptEmojiTags({
        count: candidates.length,
        rootDir,
        tagPrefix: '🧹',
    });

    await mkdir(promptsDir, { recursive: true });

    const createdPrompts: string[] = [];

    for (const [index, candidate] of candidates.entries()) {
        const slug = buildPromptSlug(candidate.relativePath);
        const number = promptNumbering.startNumber + index * promptNumbering.step;
        const filename = buildPromptFilename(promptNumbering.datePrefix, number, slug);
        const promptPath = join(promptsDir, filename);
        const selectedEmoji = selectedEmojis[index];

        if (!selectedEmoji) {
            throw new Error(`Missing emoji for prompt candidate #${index + 1}`);
        }

        const emojiTag = formatPromptEmojiTag(selectedEmoji, '🧹');
        const promptContent = buildPromptContent(candidate, emojiTag);

        await writeFile(promptPath, promptContent, 'utf-8');
        createdPrompts.push(filename);
    }

    return createdPrompts;
}

/**
 * Creates the prompt slug from a file path while keeping it readable.
 *
 * @private function of writeRefactorCandidatePrompts
 */
function buildPromptSlug(relativePath: string): string {
    const prefixed = `${PROMPT_SLUG_PREFIX}-${normalizeToKebabCase(relativePath) || 'file'}`;
    if (prefixed.length <= PROMPT_SLUG_MAX_LENGTH) {
        return prefixed;
    }

    const hash = hashString(prefixed).slice(0, 6);
    const trimmed = prefixed.slice(0, PROMPT_SLUG_MAX_LENGTH - hash.length - 1).replace(/-+$/g, '');
    return `${trimmed}-${hash}`;
}

/**
 * Creates a short stable hash used for trimmed slugs.
 *
 * @private function of writeRefactorCandidatePrompts
 */
function hashString(value: string): string {
    let hash = 5381;

    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) + hash + value.charCodeAt(i);
    }

    return (hash >>> 0).toString(36);
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
