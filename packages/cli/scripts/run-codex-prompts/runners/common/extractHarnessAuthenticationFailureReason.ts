/**
 * Maximum length of the harness reason quoted back to the user.
 */
const MAXIMUM_AUTHENTICATION_FAILURE_REASON_LENGTH = 300;

/**
 * Keys of machine-readable harness output whose string value carries the human-readable failure reason.
 *
 * Harnesses which stream JSON events - like Claude Code with its `stream-json` output - report the reason only
 * inside such a value, surrounded by hundreds of characters of session metadata which must never be shown to
 * the user. The keys are ordered from the most to the least conclusive one.
 */
const HARNESS_FAILURE_MESSAGE_KEYS = ['result', 'error_message', 'message', 'text'] as const;

/**
 * Patterns which extract one JSON string value reported under a harness failure message key.
 */
const HARNESS_FAILURE_MESSAGE_PATTERNS: ReadonlyArray<RegExp> = HARNESS_FAILURE_MESSAGE_KEYS.map(
    (messageKey) => new RegExp(`"${messageKey}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'g'),
);

/**
 * Signatures which mean that the harness refused to work because it is not logged in.
 *
 * They are deliberately narrow phrases instead of single words like `login`, because the output of a harness
 * routinely mentions its own `/login` command among the commands it offers, and such a mention must never be
 * read as a failed login.
 */
const AUTHENTICATION_FAILURE_PATTERNS: ReadonlyArray<RegExp> = [
    /\bauthentication[ _-]?failed\b/i,
    /\bfailed to authenticate\b/i,
    /\bnot authenticated\b/i,
    /\bnot logged[ -]?in\b/i,
    /\bnot signed[ -]?in\b/i,
    /\bno authentication information found\b/i,
    /\bauthentication (?:is )?required\b/i,
    /\blogin (?:is )?required\b/i,
    /\bplease (?:log|sign) in\b/i,
    /\bunauthorized\b/i,
    /\b(?:oauth|session|token|credentials?|login)\b[^.]{0,60}?\bexpired\b/i,
    /\bexpired\b[^.]{0,60}?\b(?:oauth|session|token|credentials?|login)\b/i,
    /\binvalid api[ _-]?key\b/i,
    /\bmissing api[ _-]?key\b/i,
    /\binvalid credentials?\b/i,
];

/**
 * Reads the reason why a harness refused to work because it is not logged in, from its raw CLI output.
 *
 * Messages the harness reports in machine-readable output are preferred over its raw output lines, so the
 * reason is the sentence the harness wrote for a human and not the JSON event which transported it.
 *
 * @returns One short single-line reason, or `undefined` when the failure was not caused by authentication.
 */
export function extractHarnessAuthenticationFailureReason(harnessOutput: string): string | undefined {
    const reportedMessages = [...extractHarnessReportedMessages(harnessOutput), ...harnessOutput.split(/\r?\n/)];

    for (const reportedMessage of reportedMessages) {
        const reason = reportedMessage.replace(/\s+/g, ' ').trim();

        if (isAuthenticationFailureReason(reason)) {
            return limitAuthenticationFailureReason(reason);
        }
    }

    return undefined;
}

/**
 * Lists the human-readable messages a harness reported in its machine-readable output.
 */
function extractHarnessReportedMessages(harnessOutput: string): ReadonlyArray<string> {
    const reportedMessages: Array<string> = [];

    for (const messagePattern of HARNESS_FAILURE_MESSAGE_PATTERNS) {
        for (const match of harnessOutput.matchAll(messagePattern)) {
            const reportedMessage = parseSerializedJsonString(match[1]);

            if (reportedMessage !== undefined) {
                reportedMessages.push(reportedMessage);
            }
        }
    }

    return reportedMessages;
}

/**
 * Reads one JSON string literal back into plain text, tolerating output which only looks like JSON.
 */
function parseSerializedJsonString(serializedString: string | undefined): string | undefined {
    if (serializedString === undefined) {
        return undefined;
    }

    try {
        const parsedString: unknown = JSON.parse(serializedString);

        return typeof parsedString === 'string' ? parsedString : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Returns true when one message of the harness says that it is not logged in.
 */
function isAuthenticationFailureReason(reportedMessage: string): boolean {
    return AUTHENTICATION_FAILURE_PATTERNS.some((pattern) => pattern.test(reportedMessage));
}

/**
 * Shortens a very long reason, so the guidance which follows it stays visible in the terminal.
 */
function limitAuthenticationFailureReason(reason: string): string {
    if (reason.length <= MAXIMUM_AUTHENTICATION_FAILURE_REASON_LENGTH) {
        return reason;
    }

    return `${reason.slice(0, MAXIMUM_AUTHENTICATION_FAILURE_REASON_LENGTH)}...`;
}
