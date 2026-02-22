import type { BookCommitment } from '../../commitments/_base/BookCommitment';

/**
 * Supported pseudo-agent kinds.
 *
 * @private internal utility of pseudo-agent resolution
 */
export type PseudoAgentKind = 'USER' | 'VOID';

/**
 * Canonical pseudo-agent URL representing the current human user.
 *
 * @private internal utility of pseudo-agent resolution
 */
export const PSEUDO_AGENT_USER_URL = 'https://pseudo-agent.invalid/user';

/**
 * Canonical pseudo-agent URL representing void / nothingness.
 *
 * @private internal utility of pseudo-agent resolution
 */
export const PSEUDO_AGENT_VOID_URL = 'https://pseudo-agent.invalid/void';

/**
 * Canonical compact token representation of the `{Void}` pseudo-agent.
 *
 * @private internal utility of pseudo-agent resolution
 */
export const VOID_PSEUDO_AGENT_REFERENCE = '{Void}';

/**
 * Legacy aliases that historically behaved like `FROM VOID`.
 */
const LEGACY_VOID_ALIASES = new Set<string>(['void', 'null', 'none', 'nil']);

/**
 * Mapping from normalized pseudo-agent names to their runtime kinds.
 */
const PSEUDO_AGENT_REFERENCE_KIND_MAP: Readonly<Record<string, PseudoAgentKind>> = {
    user: 'USER',
    void: 'VOID',
};

/**
 * Maps pseudo-agent kinds to canonical pseudo-agent URLs.
 */
const PSEUDO_AGENT_URL_BY_KIND: Readonly<Record<PseudoAgentKind, string>> = {
    USER: PSEUDO_AGENT_USER_URL,
    VOID: PSEUDO_AGENT_VOID_URL,
};

/**
 * Unwraps a compact reference token (`{Name}` or `@Name`) to plain reference payload.
 *
 * @param rawReference - Raw token payload.
 * @returns Unwrapped reference text.
 */
function unwrapPseudoReference(rawReference: string): string {
    const trimmedReference = rawReference.trim();
    const bracketMatch = /^\{(.+)\}$/.exec(trimmedReference);
    if (bracketMatch?.[1]) {
        return bracketMatch[1].trim();
    }

    if (trimmedReference.startsWith('@')) {
        return trimmedReference.slice(1).trim();
    }

    return trimmedReference;
}

/**
 * Normalizes pseudo-agent reference key for case-insensitive matching.
 *
 * @param rawReference - Raw pseudo-agent reference.
 * @returns Normalized key, for example `User` -> `user`.
 */
function normalizePseudoReferenceKey(rawReference: string): string {
    return unwrapPseudoReference(rawReference)
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
}

/**
 * Resolves pseudo-agent kind from compact reference text.
 *
 * This accepts compact references in all supported syntaxes:
 * `{User}`, `{user}`, `@USER`, `Void`, etc.
 *
 * @param rawReference - Raw reference token or payload.
 * @returns Pseudo-agent kind or `null` when the reference is not pseudo.
 * @private internal utility of pseudo-agent resolution
 */
export function resolvePseudoAgentKindFromReference(rawReference: string): PseudoAgentKind | null {
    if (!rawReference.trim()) {
        return null;
    }

    const normalizedReference = normalizePseudoReferenceKey(rawReference);
    return PSEUDO_AGENT_REFERENCE_KIND_MAP[normalizedReference] || null;
}

/**
 * Resolves pseudo-agent kind from canonical pseudo-agent URL.
 *
 * @param agentUrl - URL to inspect.
 * @returns Pseudo-agent kind or `null` when the URL is not pseudo.
 * @private internal utility of pseudo-agent resolution
 */
export function resolvePseudoAgentKindFromUrl(agentUrl: string): PseudoAgentKind | null {
    const normalizedUrl = agentUrl.trim().toLowerCase();

    if (normalizedUrl === PSEUDO_AGENT_USER_URL) {
        return 'USER';
    }

    if (normalizedUrl === PSEUDO_AGENT_VOID_URL) {
        return 'VOID';
    }

    return null;
}

/**
 * Checks whether a URL points to a pseudo-agent.
 *
 * @param agentUrl - URL to inspect.
 * @returns True when the URL identifies a pseudo-agent.
 * @private internal utility of pseudo-agent resolution
 */
export function isPseudoAgentUrl(agentUrl: string): boolean {
    return resolvePseudoAgentKindFromUrl(agentUrl) !== null;
}

/**
 * Creates canonical pseudo-agent URL by pseudo-agent kind.
 *
 * @param pseudoAgentKind - Pseudo-agent kind.
 * @returns Canonical pseudo-agent URL.
 * @private internal utility of pseudo-agent resolution
 */
export function createPseudoAgentUrl(pseudoAgentKind: PseudoAgentKind): string {
    return PSEUDO_AGENT_URL_BY_KIND[pseudoAgentKind];
}

/**
 * Returns true when reference should behave as the `{Void}` pseudo-agent.
 *
 * This keeps backward compatibility with legacy aliases (`VOID`, `NULL`, `NONE`, `NIL`)
 * while also supporting compact pseudo-agent references.
 *
 * @param rawReference - Raw reference content.
 * @returns True when the reference maps to void.
 * @private internal utility of pseudo-agent resolution
 */
export function isVoidPseudoAgentReference(rawReference: string): boolean {
    const pseudoAgentKind = resolvePseudoAgentKindFromReference(rawReference);
    if (pseudoAgentKind === 'VOID') {
        return true;
    }

    if (resolvePseudoAgentKindFromUrl(rawReference) === 'VOID') {
        return true;
    }

    const normalizedReference = normalizePseudoReferenceKey(rawReference);
    return LEGACY_VOID_ALIASES.has(normalizedReference);
}

/**
 * Returns true when reference resolves to the `{User}` pseudo-agent.
 *
 * @param rawReference - Raw reference content.
 * @returns True when the reference maps to user.
 * @private internal utility of pseudo-agent resolution
 */
export function isUserPseudoAgentReference(rawReference: string): boolean {
    return resolvePseudoAgentKindFromReference(rawReference) === 'USER';
}

/**
 * Checks whether a pseudo-agent can be used inside the specified commitment.
 *
 * `USER` is intentionally disallowed in FROM/IMPORT commitments.
 *
 * @param pseudoAgentKind - Pseudo-agent kind to validate.
 * @param commitmentType - Commitment where it is used.
 * @returns True when the pseudo-agent is allowed in the commitment.
 * @private internal utility of pseudo-agent resolution
 */
export function isPseudoAgentAllowedInCommitment(
    pseudoAgentKind: PseudoAgentKind,
    commitmentType: BookCommitment,
): boolean {
    if (pseudoAgentKind === 'USER') {
        return commitmentType === 'TEAM';
    }

    return true;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
