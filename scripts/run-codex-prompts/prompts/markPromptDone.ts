import { formatCodexLoginMethod, type CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { CoderRunStep } from '../common/CoderRunStep';
import { formatCoderRunSteps } from './formatCoderRunSteps';
import { formatPromptAttemptMetadata } from './formatPromptAttemptMetadata';
import { formatRunnerSignature } from './formatRunnerSignature';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

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
): void {
    if (section.statusLineIndex === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} does not have a status line.`);
    }

    const line = file.lines[section.statusLineIndex];
    if (line === undefined) {
        throw new Error(`Prompt ${section.index + 1} in ${file.name} points to a missing status line.`);
    }
    const runnerSignature = formatRunnerSignature(runnerName, modelName);
    const attemptMetadata = formatPromptAttemptMetadata('done', attemptCount);
    const loginMethodLabel = formatCodexLoginMethod(loginMethod);
    const loginMethodSuffix = loginMethodLabel ? ` (${loginMethodLabel})` : '';
    const stepsSummary = formatCoderRunSteps(steps);
    const stepsSuffix = stepsSummary === '' ? '' : ` - ${stepsSummary}`;

    // Replace "[ ]" or "[ ] !!..." with "[x] by runner (login method) - Step $price duration; ..."
    file.lines[section.statusLineIndex] = line.replace(
        /\[\s*\]\s*!*\s*$/,
        `[x] ${attemptMetadata}by ${runnerSignature}${loginMethodSuffix}${stepsSuffix}`,
    );
}
