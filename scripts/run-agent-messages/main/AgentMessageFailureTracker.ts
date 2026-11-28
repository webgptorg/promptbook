import colors from 'colors';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import type { AgentMessageFile } from '../messages/AgentMessageFile';
import { moveAgentMessageToFailed } from '../messages/moveAgentMessageToFailed';
import { formatUnknownErrorDetails } from '../../run-codex-prompts/common/formatUnknownErrorDetails';
import { getAgentWatchErrorContext } from './handleAgentWatchError';

/**
 * Default number of failed queued-message attempts allowed before the watcher stops retrying that message.
 */
const DEFAULT_MAX_MESSAGE_PROCESSING_FAILURES = 3;

/**
 * Maximum number of characters copied from the final runner error into the failed chat message.
 */
const MAX_FAILED_MESSAGE_ERROR_DETAILS_LENGTH = 4_000;

/**
 * One queued-message failure counter.
 */
type AgentMessageFailureRecord = {
    readonly failureCount: number;
};

/**
 * Result of recording one failed queued-message attempt.
 */
export type AgentMessageFailureTrackingResult = {
    readonly failureCount: number;
    readonly maxMessageProcessingFailures: number;
    readonly isMessageMovedToFailed: boolean;
};

/**
 * Tracks repeated watch-level failures for queued message files and stops retrying them after a configured cap.
 */
export class AgentMessageFailureTracker {
    private readonly failuresByMessageKey = new Map<string, AgentMessageFailureRecord>();
    private readonly maxMessageProcessingFailures: number;

    public constructor(options: { readonly maxMessageProcessingFailures?: number } = {}) {
        this.maxMessageProcessingFailures = normalizeMaxMessageProcessingFailures(options.maxMessageProcessingFailures);
    }

    /**
     * Clears the failure counter after a queued message is processed successfully.
     */
    public clearMessageFailure(projectPath: string, messageFile: AgentMessageFile | undefined): void {
        if (!messageFile) {
            return;
        }

        this.failuresByMessageKey.delete(createAgentMessageFailureKey(projectPath, messageFile.relativePath));
    }

    /**
     * Records one queued-message failure and moves the message into `messages/failed` when the retry cap is reached.
     */
    public async recordFailure(error: unknown): Promise<AgentMessageFailureTrackingResult | null> {
        const errorContext = getAgentWatchErrorContext(error);
        if (!errorContext?.projectPath || !errorContext.queuedMessageRelativePath) {
            return null;
        }

        const messageKey = createAgentMessageFailureKey(
            errorContext.projectPath,
            errorContext.queuedMessageRelativePath,
        );
        const previousFailureCount = this.failuresByMessageKey.get(messageKey)?.failureCount ?? 0;
        const failureCount = previousFailureCount + 1;

        if (failureCount < this.maxMessageProcessingFailures) {
            this.failuresByMessageKey.set(messageKey, { failureCount });
            return {
                failureCount,
                maxMessageProcessingFailures: this.maxMessageProcessingFailures,
                isMessageMovedToFailed: false,
            };
        }

        try {
            await moveAgentMessageToFailed({
                projectPath: errorContext.projectPath,
                messageFile: createAgentMessageFileFromContext(
                    errorContext.projectPath,
                    errorContext.queuedMessageRelativePath,
                ),
                failureReason: buildFailedQueuedMessageReason({
                    error,
                    failureCount,
                    maxMessageProcessingFailures: this.maxMessageProcessingFailures,
                }),
            });
            this.failuresByMessageKey.delete(messageKey);
            console.error(
                colors.yellow(
                    `Moved ${errorContext.queuedMessageRelativePath} to messages/failed after ${failureCount} failed attempt(s).`,
                ),
            );
        } catch (moveError) {
            this.failuresByMessageKey.set(messageKey, { failureCount });
            console.error(
                colors.yellow(
                    `Failed to move ${
                        errorContext.queuedMessageRelativePath
                    } to messages/failed: ${formatUnknownErrorDetails(moveError)}`,
                ),
            );
            return {
                failureCount,
                maxMessageProcessingFailures: this.maxMessageProcessingFailures,
                isMessageMovedToFailed: false,
            };
        }

        return {
            failureCount,
            maxMessageProcessingFailures: this.maxMessageProcessingFailures,
            isMessageMovedToFailed: true,
        };
    }
}

/**
 * Creates the stable in-memory key for one queued message.
 */
function createAgentMessageFailureKey(projectPath: string, queuedMessageRelativePath: string): string {
    return `${projectPath}\0${queuedMessageRelativePath}`;
}

/**
 * Recreates the selected queued message descriptor from watch-loop error context.
 */
function createAgentMessageFileFromContext(projectPath: string, queuedMessageRelativePath: string): AgentMessageFile {
    return {
        absolutePath: join(projectPath, queuedMessageRelativePath),
        relativePath: queuedMessageRelativePath.replace(/\\/gu, '/'),
        fileName: getFileNameFromRelativePath(queuedMessageRelativePath),
    };
}

/**
 * Extracts the filename from a normalized or platform-specific relative path.
 */
function getFileNameFromRelativePath(relativePath: string): string {
    const pathParts = relativePath.replace(/\\/gu, '/').split('/');
    return pathParts[pathParts.length - 1] || 'message.book';
}

/**
 * Builds the message shown to the chat user when the local runner stops retrying.
 */
function buildFailedQueuedMessageReason(options: {
    readonly error: unknown;
    readonly failureCount: number;
    readonly maxMessageProcessingFailures: number;
}): string {
    const errorDetails = limitFailureDetails(formatUnknownErrorDetails(options.error));

    return spaceTrim(
        (block) => `
            Local agent runner failed after ${options.failureCount} attempt(s) and stopped retrying.

            Fix the runner or API configuration before trying again. The maximum failed-attempt limit is currently ${
                options.maxMessageProcessingFailures
            }.

            Last runner error:
            \`\`\`
            ${block(errorDetails)}
            \`\`\`
        `,
    );
}

/**
 * Keeps the synthetic failed chat message bounded even when runner logs are long.
 */
function limitFailureDetails(errorDetails: string): string {
    const normalizedErrorDetails = errorDetails.trim();

    if (normalizedErrorDetails.length <= MAX_FAILED_MESSAGE_ERROR_DETAILS_LENGTH) {
        return normalizedErrorDetails;
    }

    return spaceTrim(`
        [...runner error truncated to the last ${MAX_FAILED_MESSAGE_ERROR_DETAILS_LENGTH} characters...]
        ${normalizedErrorDetails.slice(-MAX_FAILED_MESSAGE_ERROR_DETAILS_LENGTH)}
    `);
}

/**
 * Normalizes the retry cap used by standalone CLI runs when no server-provided limit is available.
 */
function normalizeMaxMessageProcessingFailures(rawValue: number | undefined): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return DEFAULT_MAX_MESSAGE_PROCESSING_FAILURES;
    }

    return Math.floor(parsedValue);
}
