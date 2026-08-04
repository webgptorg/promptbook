import type { CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';
import type { CoderRunStep } from '../common/CoderRunStep';
import { buildPromptStatusDetails } from './buildPromptStatusDetails';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptStatusLine } from './writePromptStatusLine';

/**
 * Marks a prompt section as done and records the per-step usage pricing and runner details.
 */
export function markPromptDone(
    file: PromptFile,
    section: PromptSection,
    steps: ReadonlyArray<CoderRunStep>,
    runnerName: string | undefined,
    modelName: string | undefined,
    attemptCount = 1,
    loginMethod?: CodexLoginMethod,
    thinkingLevel?: ThinkingLevel,
): void {
    const statusDetails = buildPromptStatusDetails({
        steps,
        runnerName,
        modelName,
        attemptCount,
        loginMethod,
        thinkingLevel,
    });

    writePromptStatusLine(file, section, `[x] ${statusDetails}`);
}
