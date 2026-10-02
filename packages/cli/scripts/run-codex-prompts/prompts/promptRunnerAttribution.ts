/**
 * Separator between consecutive harness reports in the chronological history of one continued prompt.
 *
 * It is used both for writing and reading, so each `--git-changes continue` invocation can extend the
 * report that the preceding invocation left in the prompt status line.
 */
const INTERRUPTED_CONTINUED_BY_SEPARATOR = ', interrupted, continued by ';

/**
 * Separator written by earlier versions of `ptbk coder`, whose continuation attribution was reverse-ordered.
 *
 * Existing interrupted prompts must remain resumable after the report format becomes chronological.
 */
const LEGACY_STARTED_BY_SEPARATOR = ', started by ';

/**
 * Matches the attribution of one status line, which reaches from `by ` up to the step summary.
 */
const PROMPT_RUNNER_ATTRIBUTION_PATTERN = /(?:^|\s)by (?<attribution>.*?)(?: - |$)/u;

/**
 * Ordered runner signatures recorded in a prompt status line.
 *
 * The first signature started the work and every following signature continued an interrupted run.
 */
export type PromptRunnerAttribution = ReadonlyArray<string>;

/**
 * Formats who worked on one prompt for its status line.
 *
 * Produces `` by Claude Code `claude-opus-5` `` for a prompt implemented by a single harness and
 * `` by OpenAI Codex `gpt-5.6-luna`, interrupted, continued by Claude Code `claude-opus-5` `` for a
 * prompt which one harness started and another one continued through `--git-changes continue`.
 */
export function formatPromptRunnerAttribution(options: {
    /**
     * Harness which runs the prompt right now, already formatted as a runner signature.
     */
    readonly currentRunnerSignature: string;

    /**
     * Chronological runner report read from the interrupted prompt before its status line is rewritten.
     */
    readonly previousRunnerSignatures?: PromptRunnerAttribution;
}): string {
    const { currentRunnerSignature, previousRunnerSignatures } = options;
    const runnerSignatures = [...(previousRunnerSignatures ?? [])];

    const latestRunnerSignature = runnerSignatures.at(-1);

    if (latestRunnerSignature === undefined) {
        return `by ${currentRunnerSignature}`;
    }

    if (isSameRunnerSignature(latestRunnerSignature, currentRunnerSignature)) {
        runnerSignatures[runnerSignatures.length - 1] = resolveLatestRunnerSignature(
            latestRunnerSignature,
            currentRunnerSignature,
        );
    } else {
        runnerSignatures.push(currentRunnerSignature);
    }

    return `by ${runnerSignatures.join(INTERRUPTED_CONTINUED_BY_SEPARATOR)}`;
}

/**
 * Reads the chronological harness report recorded on one prompt status line.
 *
 * A line written by a single harness produces one signature. A line which has already been continued produces
 * every signature in the order in which it worked on the prompt, so another continuation can append to it.
 */
export function parsePromptRunnerAttribution(statusLine: string): PromptRunnerAttribution | undefined {
    const attribution = statusLine.match(PROMPT_RUNNER_ATTRIBUTION_PATTERN)?.groups?.attribution?.trim();

    if (!attribution) {
        return undefined;
    }

    const legacyStartedBySeparatorIndex = attribution.indexOf(LEGACY_STARTED_BY_SEPARATOR);

    if (legacyStartedBySeparatorIndex !== -1) {
        const currentRunnerSignature = attribution.slice(0, legacyStartedBySeparatorIndex).trim();
        const startedByRunnerSignature = attribution
            .slice(legacyStartedBySeparatorIndex + LEGACY_STARTED_BY_SEPARATOR.length)
            .trim();

        return toPromptRunnerAttribution([startedByRunnerSignature, currentRunnerSignature]);
    }

    return toPromptRunnerAttribution(attribution.split(INTERRUPTED_CONTINUED_BY_SEPARATOR));
}

/**
 * Keeps the authentication label that is already known when the same harness resumes its own work before
 * reporting another label, and otherwise upgrades that last report with the newly known label.
 */
function resolveLatestRunnerSignature(latestRunnerSignature: string, currentRunnerSignature: string): string {
    if (currentRunnerSignature.startsWith(`${latestRunnerSignature} (`)) {
        return currentRunnerSignature;
    }

    return latestRunnerSignature;
}

/**
 * Checks whether two report signatures describe the same harness/model/thinking configuration, allowing the
 * newer signature to add its authentication label.
 */
function isSameRunnerSignature(latestRunnerSignature: string, currentRunnerSignature: string): boolean {
    return (
        latestRunnerSignature === currentRunnerSignature ||
        latestRunnerSignature.startsWith(`${currentRunnerSignature} (`) ||
        currentRunnerSignature.startsWith(`${latestRunnerSignature} (`)
    );
}

/**
 * Normalizes parsed signatures and rejects malformed or empty attribution fragments.
 */
function toPromptRunnerAttribution(runnerSignatures: ReadonlyArray<string>): PromptRunnerAttribution | undefined {
    const normalizedRunnerSignatures = runnerSignatures
        .map((runnerSignature) => runnerSignature.trim())
        .filter(Boolean);

    return normalizedRunnerSignatures.length === 0 ? undefined : normalizedRunnerSignatures;
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names
