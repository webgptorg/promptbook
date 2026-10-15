/**
 * Process exit codes used by every command.
 *
 * @private shared CLI contract
 */
export const EXIT = {
    /** The requested operation succeeded. */
    success: 0,
    /** The operation failed. */
    failure: 1,
    /** The invocation itself was invalid (unknown flag, contradictory options, ...). */
    usage: 2,
    /** The operation ended in an explicit incomplete/not-ready state (setup incomplete, waiting for a human, ...). */
    incomplete: 3,
} as const;

/**
 * Classification of a failure that decides the suggested next step.
 *
 * @private shared CLI contract
 */
export type ErrorKind =
    | 'usage'
    | 'setup'
    | 'configuration'
    | 'authentication'
    | 'quota'
    | 'technical'
    | 'persistence'
    | 'conflict'
    | 'not-found'
    | 'unsupported'
    | 'cancelled'
    | 'incomplete'
    | 'internal';

/**
 * Structured, actionable details of a failure.
 *
 * @private shared CLI contract
 */
export type ErrorDetails = {
    /** Failure classification. */
    readonly kind: ErrorKind;
    /** Phase or step that failed (e.g. `harness setup`, `commit`). */
    readonly phase?: string;
    /** Affected project path. */
    readonly project?: string;
    /** Affected task reference. */
    readonly task?: string;
    /** Affected harness identifier. */
    readonly harness?: string;
    /** Observed cause; omitted when unknown. */
    readonly reason?: string;
    /** Effect on current work. */
    readonly effect?: string;
    /** What was preserved. */
    readonly preserved?: string;
    /** Concrete next actions. */
    readonly next?: readonly string[];
    /** Path of a saved diagnostic trace that actually exists. */
    readonly trace?: string;
    /** Exit code override. */
    readonly exitCode?: number;
    /** Original cause. */
    readonly cause?: unknown;
};

/**
 * An error carrying everything needed for the shared error experience.
 *
 * @private shared CLI contract
 */
export class PtbkError extends Error {
    /** Structured details. */
    public readonly details: ErrorDetails;

    /**
     * Creates an error with a one-line summary and actionable details.
     */
    public constructor(summary: string, details: ErrorDetails) {
        super(summary, details.cause === undefined ? undefined : { cause: details.cause });
        this.name = 'PtbkError';
        this.details = details;
    }

    /** Exit code for a command that terminates with this error. */
    public get exitCode(): number {
        if (this.details.exitCode !== undefined) return this.details.exitCode;
        if (this.details.kind === 'usage') return EXIT.usage;
        if (this.details.kind === 'incomplete') return EXIT.incomplete;
        return EXIT.failure;
    }
}

/**
 * Creates a usage error pointing to the affected command's help.
 *
 * @private shared CLI contract
 */
export function usageError(summary: string, commandPath: string, reason?: string): PtbkError {
    return new PtbkError(summary, {
        kind: 'usage',
        reason,
        next: [`Run \`ptbk ${commandPath ? `${commandPath} ` : ''}--help\` for usage.`],
    });
}

/**
 * Converts any thrown value into a message string.
 *
 * @private shared CLI contract
 */
export function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

