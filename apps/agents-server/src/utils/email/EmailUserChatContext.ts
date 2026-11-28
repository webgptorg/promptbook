/**
 * Email transport context persisted with a durable user-chat job.
 */
export type EmailUserChatContext = {
    readonly agentDisplayName: string;
    readonly agentLocalParts: ReadonlyArray<string>;
    readonly sender: string;
    readonly to: ReadonlyArray<string>;
    readonly cc: ReadonlyArray<string>;
    readonly deliveredTo: string;
    readonly subject: string;
    readonly messageId: string | null;
    readonly references: ReadonlyArray<string>;
};

/**
 * Durable job parameter key containing inbound email transport context.
 */
export const EMAIL_USER_CHAT_CONTEXT_PARAMETER = 'emailContext';

/**
 * Reads validated email context from arbitrary durable-job parameters.
 */
export function parseEmailUserChatContext(parameters: Readonly<Record<string, unknown>>): EmailUserChatContext | null {
    const value = parameters[EMAIL_USER_CHAT_CONTEXT_PARAMETER];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Partial<Record<keyof EmailUserChatContext, unknown>>;
    if (
        typeof candidate.sender !== 'string' ||
        typeof candidate.agentDisplayName !== 'string' ||
        typeof candidate.deliveredTo !== 'string' ||
        typeof candidate.subject !== 'string' ||
        !isStringArray(candidate.agentLocalParts) ||
        !isStringArray(candidate.to) ||
        !isStringArray(candidate.cc) ||
        !isStringArray(candidate.references) ||
        (candidate.messageId !== null && typeof candidate.messageId !== 'string')
    ) {
        return null;
    }

    return {
        agentDisplayName: candidate.agentDisplayName,
        agentLocalParts: candidate.agentLocalParts,
        sender: candidate.sender,
        to: candidate.to,
        cc: candidate.cc,
        deliveredTo: candidate.deliveredTo,
        subject: candidate.subject,
        messageId: candidate.messageId,
        references: candidate.references,
    };
}

/**
 * Checks whether an unknown value is an array of strings.
 */
function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
