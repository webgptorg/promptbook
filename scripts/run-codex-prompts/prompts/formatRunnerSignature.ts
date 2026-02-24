/**
 * Formats runner details for prompt status lines.
 */
export function formatRunnerSignature(runnerName: string | undefined, modelName: string | undefined): string {
    const normalizedRunner = runnerName?.trim();
    const normalizedModel = modelName?.trim();

    if (!normalizedRunner && !normalizedModel) {
        return 'unknown';
    }

    const runnerLabel = normalizedRunner || 'unknown';

    if (!normalizedModel) {
        return runnerLabel;
    }

    return `${runnerLabel} \`${normalizedModel}\``;
}
