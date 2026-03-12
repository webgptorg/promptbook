/**
 * Builds the synthetic user-like message injected when a timeout elapses.
 *
 * @private internal utility of userChatTimeout
 */
export function createTimeoutWakeUpMessage(options: {
    readonly timeoutId: string;
    readonly durationMs: number;
    readonly message?: string | null;
}): string {
    const lines = [
        `⏱️ Timeout elapsed after ${options.durationMs}ms.`,
        `timeoutId: ${options.timeoutId}`,
    ];

    if (options.message && options.message.trim()) {
        lines.push(options.message.trim());
    }

    return lines.join('\n');
}
