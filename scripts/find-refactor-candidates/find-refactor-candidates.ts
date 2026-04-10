import * as dotenv from 'dotenv';

import colors from 'colors';
import { basename, join } from 'path';
import { assertsError } from '../../src/errors/assertsError';
import { PROMPTS_DIR_NAME } from './find-refactor-candidates.constants';
import { findRefactorCandidatesInProject } from './findRefactorCandidatesInProject';
import { loadExistingPromptTargets } from './loadExistingPromptTargets';
import type { RefactorCandidate } from './RefactorCandidate';
import {
    DEFAULT_REFACTOR_CANDIDATE_LEVEL,
    getRefactorCandidateLevelConfiguration,
    type RefactorCandidateLevel,
} from './RefactorCandidateLevel';
import { resolveRefactorCandidateProject } from './resolveRefactorCandidateProject';
import { writeRefactorCandidatePrompts } from './writeRefactorCandidatePrompts';

if (require.main === module) {
    findRefactorCandidates()
        .catch((error) => {
            assertsError(error);
            console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
            console.error(colors.red(error.stack || error.message));
            process.exit(1);
        })
        .then(() => {
            process.exit(0);
        });
}

/**
 * Initializes environment for this script.
 *
 * @private utility for `findRefactorCandidates`
 */
function initializeFindRefactorCandidatesRun(): void {
    dotenv.config({ path: '.env' });
}

/**
 * Orchestrates scanning for refactor candidates and generating prompts.
 *
 * @public exported from `@promptbook/cli`
 */
export async function findRefactorCandidates(options: FindRefactorCandidatesOptions = {}): Promise<void> {
    const { level = DEFAULT_REFACTOR_CANDIDATE_LEVEL } = options;
    const heuristics = getRefactorCandidateLevelConfiguration(level);

    initializeFindRefactorCandidatesRun();

    console.info(colors.cyan('⚡🏭 Find refactor candidates'));
    console.info(colors.gray(`Using \`${level}\` scan level.`));

    const { isIgnoredRelativePath, rootDir } = await resolveRefactorCandidateProject(process.cwd());
    const promptsDir = join(rootDir, PROMPTS_DIR_NAME);
    const existingTargets = await loadExistingPromptTargets(promptsDir);
    const candidates = await findRefactorCandidatesInProject({
        heuristics,
        isIgnoredRelativePath,
        rootDir,
    });

    if (candidates.length === 0) {
        console.info(colors.green('No refactor candidates found.'));
        return;
    }

    logRefactorCandidates(candidates);

    const candidatesToWrite = candidates.filter((candidate) => !existingTargets.has(candidate.relativePath));
    const alreadyTracked = candidates.length - candidatesToWrite.length;

    if (candidatesToWrite.length === 0) {
        console.info(colors.green('All candidates already have prompts.'));
        return;
    }

    const createdPrompts = await writeRefactorCandidatePrompts({
        candidates: candidatesToWrite,
        rootDir,
        promptsDir,
    });

    console.info(colors.green(`Created ${createdPrompts.length} prompt(s) in ${PROMPTS_DIR_NAME}.`));
    if (alreadyTracked > 0) {
        console.info(colors.gray(`Skipped ${alreadyTracked} candidate(s) with existing prompts.`));
    }
}

/**
 * Options supported by the refactor-candidate finder entrypoint.
 *
 * @public exported from `@promptbook/cli`
 */
export type FindRefactorCandidatesOptions = {
    /**
     * Aggressiveness level used to score candidate files.
     */
    readonly level?: RefactorCandidateLevel;
};

/**
 * Prints discovered refactor candidates with their reasons.
 *
 * @private function of findRefactorCandidates
 */
function logRefactorCandidates(candidates: ReadonlyArray<RefactorCandidate>): void {
    for (const candidate of candidates) {
        console.info(colors.yellow(`${candidate.relativePath} <- ${candidate.reasons.join('; ')}`));
    }
}

// Note: [🟡] Code for repository script [find-refactor-candidates](scripts/find-refactor-candidates/find-refactor-candidates.ts) should never be published outside of `@promptbook/cli`
