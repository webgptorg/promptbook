import type { MessageSendAttemptRow } from '../../../utils/messagesAdmin';
import {
    formatMessageSendAttemptLog,
    getFailedMessageSendAttempts,
    resolveLatestMessageSendAttemptErrorMessage,
    resolveMessageStatusPresentation,
    type MessageStatusPresentation,
} from './messageAdminPresentation';

/**
 * Props for the direction-aware message status cell.
 */
type MessageStatusProps = {
    readonly direction: string;
    readonly attempts: ReadonlyArray<MessageSendAttemptRow> | undefined;
};

/**
 * Renders delivery status, a compact failure reason, and the complete persisted provider log.
 */
export function MessageStatus({ direction, attempts }: MessageStatusProps) {
    const status = resolveMessageStatusPresentation(direction, attempts);
    const failedAttempts = getFailedMessageSendAttempts(attempts);
    const latestErrorMessage = resolveLatestMessageSendAttemptErrorMessage(attempts);

    return (
        <div className="min-w-64 space-y-2">
            <MessageStatusBadge status={status} />
            {latestErrorMessage ? (
                <p className="max-w-sm whitespace-normal break-words text-xs leading-relaxed text-red-700">
                    {latestErrorMessage}
                </p>
            ) : null}
            {failedAttempts.length > 0 ? (
                <details className="max-w-xl whitespace-normal rounded-md border border-red-200 bg-red-50 p-2 text-xs">
                    <summary className="cursor-pointer font-medium text-red-800">
                        <span>Complete log</span> ({failedAttempts.length})
                    </summary>
                    <div className="mt-2 space-y-3">
                        {failedAttempts.map((attempt) => (
                            <pre
                                key={attempt.id}
                                className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-950 p-3 text-[10px] leading-relaxed text-gray-100"
                            >
                                {formatMessageSendAttemptLog(attempt)}
                            </pre>
                        ))}
                    </div>
                </details>
            ) : null}
        </div>
    );
}

/**
 * Props for the compact message status badge.
 */
type MessageStatusBadgeProps = {
    readonly status: MessageStatusPresentation;
};

/**
 * Renders the visual badge for one resolved message status.
 */
function MessageStatusBadge({ status }: MessageStatusBadgeProps) {
    if (status.kind === 'received') {
        return (
            <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Received
            </span>
        );
    }

    if (status.kind === 'sent') {
        return (
            <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <span>Sent</span>
                {status.providerName ? ` (${status.providerName})` : ''}
            </span>
        );
    }

    if (status.kind === 'failed') {
        return (
            <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                <span>Failed</span> ({status.attemptCount})
            </span>
        );
    }

    return (
        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
            Pending
        </span>
    );
}
