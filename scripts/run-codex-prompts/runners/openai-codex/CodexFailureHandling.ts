import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';

/**
 * Failure category used by OpenAI Codex retry/fail-fast handling.
 */
export type CodexFailureKind = 'credits-required' | 'rate-limit' | 'other';

/**
 * Error signatures that mean Codex requires credit spending to continue.
 */
const CREDITS_REQUIRED_PATTERNS = [
    /\binsufficient[_\s-]*quota\b/i,
    /\busage[_\s-]*limit[_\s-]*(?:reached|exceeded)\b/i,
    /\bcredits?\b.{0,60}\b(?:required|needed|available|balance|remaining)\b/i,
    /\b(?:requires?|need(?:ed)?|switch)\b.{0,60}\bcredits?\b/i,
    /\bfunded workspace\b/i,
    /github\.com\/settings\/billing\/codex/i,
];

/**
 * Error signatures that should trigger progressive waiting and retry.
 */
const RATE_LIMIT_OR_QUOTA_PATTERNS = [
    /\brate[_\s-]*limit\b/i,
    /\bquota\b/i,
    /\btoo many requests\b/i,
    /\b429\b/,
    /\bresource[_\s-]*exhausted\b/i,
    /\btry again in\b/i,
    /\bserver overloaded\b/i,
    /\busage[_\s-]*limit[_\s-]*(?:reached|exceeded)\b/i,
    /\bwebsocket connection limit reached\b/i,
];

/**
 * Classifies one Codex failure message into retry/fail-fast categories.
 */
export function classifyCodexFailure(details: string): CodexFailureKind {
    if (matchesAnyPattern(details, CREDITS_REQUIRED_PATTERNS)) {
        return 'credits-required';
    }

    if (matchesAnyPattern(details, RATE_LIMIT_OR_QUOTA_PATTERNS)) {
        return 'rate-limit';
    }

    return 'other';
}

/**
 * Builds a fail-fast error for cases where credit spending is disallowed.
 */
export function buildCreditsDisallowedError(details: string): NotAllowed {
    return new NotAllowed(
        spaceTrim(
            (block) => `
                OpenAI Codex reported that continuing now requires credits, but credit spending is disabled.

                Re-run with:
                \`--allow-credits\`

                Example:
                \`ptbk coder run --agent openai-codex --model gpt-5.2-codex --allow-credits\`

                Codex details:
                ${block(limitErrorDetails(details))}
            `,
        ),
    );
}

/**
 * Extracts a text description from unknown thrown values.
 */
export function extractCodexFailureDetails(error: unknown): string {
    if (error instanceof Error) {
        return error.stack ?? error.message;
    }

    return String(error);
}

/**
 * Trims very long CLI error output to keep logs and thrown messages readable.
 */
export function limitErrorDetails(details: string, maxChars = 4000): string {
    const normalized = details.trim();
    if (normalized.length <= maxChars) {
        return normalized;
    }

    return `${normalized.slice(0, maxChars)}\n\n...[truncated]`;
}

/**
 * Returns true if at least one regex matches the provided text.
 */
function matchesAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
}
