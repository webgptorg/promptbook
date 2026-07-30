import type { ThinkingLevel } from '../../../src/cli/cli-commands/coder/ThinkingLevel';

/**
 * Formats runner details for prompt status lines.
 */
export function formatRunnerSignature(
    runnerName: string | undefined,
    modelName: string | undefined,
    thinkingLevel?: ThinkingLevel,
): string {
    const normalizedRunner = runnerName?.trim();
    const normalizedModel = modelName?.trim();
    const thinkingLevelSuffix = thinkingLevel ? ` thinking \`${thinkingLevel}\`` : '';

    if (!normalizedRunner && !normalizedModel) {
        return 'unknown';
    }

    const runnerLabel = normalizedRunner || 'unknown';

    if (!normalizedModel) {
        return `${runnerLabel}${thinkingLevelSuffix}`;
    }

    return `${runnerLabel} \`${normalizedModel}\`${thinkingLevelSuffix}`;
}
