/**
 * Separator which introduces the harness that started a prompt another harness has taken over.
 *
 * It is used both for writing and for reading the attribution, so the status line of a continued prompt
 * stays parseable when yet another harness continues it later.
 */
const STARTED_BY_SEPARATOR = ', started by ';

/**
 * Matches the attribution of one status line, which reaches from `by ` up to the step summary.
 */
const PROMPT_RUNNER_ATTRIBUTION_PATTERN = /(?:^|\s)by (?<attribution>.*?)(?: - |$)/u;

/**
 * Formats who worked on one prompt for its status line.
 *
 * Produces `` by Claude Code `claude-opus-5` `` for a prompt implemented by a single harness and
 * `` by Claude Code `claude-opus-5`, started by OpenAI Codex `gpt-5.6-luna` `` for a prompt which one
 * harness started and another one continued through `--git-changes continue`.
 */
export function formatPromptRunnerAttribution(options: {
    /**
     * Harness which runs the prompt right now, already formatted as a runner signature.
     */
    readonly currentRunnerSignature: string;

    /**
     * Harness which left the prompt in the middle of its implementation, when the work was taken over.
     */
    readonly startedByRunnerSignature?: string;
}): string {
    const { currentRunnerSignature, startedByRunnerSignature } = options;

    if (startedByRunnerSignature === undefined || startedByRunnerSignature === currentRunnerSignature) {
        return `by ${currentRunnerSignature}`;
    }

    return `by ${currentRunnerSignature}${STARTED_BY_SEPARATOR}${startedByRunnerSignature}`;
}

/**
 * Reads which harness started the work recorded on one prompt status line.
 *
 * A line written by a single harness names that harness, and a line of a prompt which was already taken
 * over keeps naming the harness which started it, so the original author survives any number of takeovers.
 */
export function parsePromptStartedByRunnerSignature(statusLine: string): string | undefined {
    const attribution = statusLine.match(PROMPT_RUNNER_ATTRIBUTION_PATTERN)?.groups?.attribution?.trim();

    if (!attribution) {
        return undefined;
    }

    const startedBySeparatorIndex = attribution.indexOf(STARTED_BY_SEPARATOR);

    if (startedBySeparatorIndex === -1) {
        return attribution;
    }

    return attribution.slice(startedBySeparatorIndex + STARTED_BY_SEPARATOR.length).trim() || undefined;
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names
