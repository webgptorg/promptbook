/**
 * Formats optional attempt metadata stored in prompt status lines.
 */
export function formatPromptAttemptMetadata(status: 'done' | 'failed', attemptCount: number): string {
    if (attemptCount <= 1) {
        return '';
    }

    if (status === 'done') {
        return `(${attemptCount} attempts) `;
    }

    return `(failed after ${attemptCount} attempts) `;
}
