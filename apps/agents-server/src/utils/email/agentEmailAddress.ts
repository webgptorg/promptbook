/**
 * Agent identity fields used to derive routable email aliases.
 */
export type AgentEmailIdentityInput = {
    readonly agentName: string;
    readonly permanentId: string;
    readonly fullname?: string | null;
};

/**
 * Removes display-name syntax and plus tags, then lowercases an email address.
 *
 * This is also the canonical identity used for ad-hoc email users.
 */
export function normalizeEmailAddressForIdentity(value: string): string {
    const emailAddress = extractEmailAddress(value).toLowerCase();
    const separatorIndex = emailAddress.lastIndexOf('@');

    if (separatorIndex === -1) {
        return emailAddress;
    }

    const localPart = emailAddress.slice(0, separatorIndex).split('+', 1)[0] || '';
    return `${localPart}@${emailAddress.slice(separatorIndex + 1)}`;
}

/**
 * Creates all accepted local parts for an agent name or identifier.
 *
 * Both dotted (`john.doe`) and compact (`johndoe`) spellings are returned.
 */
export function createAgentEmailLocalParts(value: string): string[] {
    const words = normalizeEmailWords(value);

    if (words.length === 0) {
        return [];
    }

    return [...new Set([words.join('.'), words.join('')])];
}

/**
 * Creates the preferred, human-readable email address for an agent.
 */
export function createAgentEmailAddress(identity: AgentEmailIdentityInput, domain: string): string {
    const localPart =
        createAgentEmailLocalParts(identity.fullname || '')[0] ||
        createAgentEmailLocalParts(identity.agentName)[0] ||
        createAgentIdEmailLocalPart(identity.permanentId) ||
        createAgentEmailLocalParts(identity.permanentId)[0];

    return `${localPart}@${normalizeEmailDomain(domain)}`;
}

/**
 * Creates every local part which should route to one agent.
 */
export function createAgentEmailAliases(identity: AgentEmailIdentityInput): string[] {
    return [
        ...new Set([
            ...createAgentEmailLocalParts(identity.fullname || ''),
            ...createAgentEmailLocalParts(identity.agentName),
            createAgentIdEmailLocalPart(identity.permanentId),
            ...createAgentEmailLocalParts(identity.permanentId),
        ].filter(Boolean)),
    ];
}

/**
 * Normalizes a recipient local part for agent lookup while preserving plus tags for replies elsewhere.
 */
export function normalizeAgentEmailRecipientLocalPart(value: string): string {
    const emailAddress = extractEmailAddress(value).toLowerCase();
    const localPart = emailAddress.includes('@') ? emailAddress.slice(0, emailAddress.lastIndexOf('@')) : emailAddress;
    return localPart.split('+', 1)[0] || '';
}

/**
 * Extracts the mailbox from either a bare address or a display-name address.
 */
export function extractEmailAddress(value: string): string {
    return value.match(/<\s*([^>]+?)\s*>/)?.[1]?.trim() || value.trim();
}

/**
 * Normalizes a mail domain for comparisons and generated addresses.
 */
export function normalizeEmailDomain(value: string): string {
    return value.trim().replace(/\.$/, '').toLowerCase();
}

/**
 * Preserves the exact punctuation of an agent id when it is valid in an email local part.
 */
export function createAgentIdEmailLocalPart(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/\.{2,}/g, '.')
        .replace(/^[.-]+|[.-]+$/g, '');
}

/**
 * Converts a human name or identifier to ASCII email-local-part words.
 */
function normalizeEmailWords(value: string): string[] {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean);
}
