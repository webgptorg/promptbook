import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import glob from 'glob-promise';
import { join } from 'path';
import { PROMPT_TARGET_LABEL } from './find-refactor-candidates.constants';
import { normalizeRefactorCandidatePath } from './normalizeRefactorCandidatePath';

/**
 * Collects all repo-relative target paths already referenced in prompts.
 *
 * @private function of findRefactorCandidates
 */
export async function loadExistingPromptTargets(promptsDir: string): Promise<Set<string>> {
    if (!existsSync(promptsDir)) {
        return new Set();
    }

    const promptFiles = await glob('**/*.md', {
        cwd: promptsDir,
        nodir: true,
    });
    const targets = new Set<string>();
    const targetRegex = new RegExp(
        `^\\s*-\\s+${escapeRegExp(PROMPT_TARGET_LABEL)}:\\s+\\\`(?<path>[^\\\`]+)\\\``,
        'gm',
    );

    for (const promptFile of promptFiles) {
        const content = await readFile(join(promptsDir, promptFile), 'utf-8');

        for (const match of content.matchAll(targetRegex)) {
            const captured = match.groups?.path;
            if (captured) {
                targets.add(normalizeRefactorCandidatePath(captured));
            }
        }
    }

    return targets;
}

/**
 * Escapes a string for use in a regular expression literal.
 *
 * @private function of loadExistingPromptTargets
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Note: [⚫] Code for repository script [loadExistingPromptTargets](scripts/find-refactor-candidates/loadExistingPromptTargets.ts) should never be published in any package */
