import { parseAgentSource } from '@promptbook-local/core';
import type { AgentBasicInformation, string_book } from '@promptbook-local/types';
import { createHash } from 'crypto';
import { getUserDataValue, upsertUserDataValue } from './userData';

/**
 * Prefix used for `UserData.key` entries that store accepted META DISCLAIMER records.
 */
const META_DISCLAIMER_USER_DATA_KEY_PREFIX = 'meta-disclaimer:';

/**
 * Version marker for persisted disclaimer agreement payloads.
 */
const META_DISCLAIMER_AGREEMENT_VERSION = 1;

/**
 * Stored agreement payload persisted in `UserData.value`.
 */
export type MetaDisclaimerAgreementRecord = {
    version: number;
    agentPermanentId: string;
    disclaimerHash: string;
    agreedAt: string;
};

/**
 * Status payload describing whether an agent has a disclaimer and if it was accepted.
 */
export type MetaDisclaimerStatus = {
    enabled: boolean;
    accepted: boolean;
    markdown: string | null;
};

/**
 * Input payload for resolving acceptance against a known disclaimer string.
 */
export type HasUserAcceptedMetaDisclaimerOptions = {
    userId: number;
    agentPermanentId: string;
    disclaimerMarkdown: string;
};

/**
 * Input payload for persisting an accepted disclaimer.
 */
export type AcceptUserMetaDisclaimerOptions = {
    userId: number;
    agentPermanentId: string;
    disclaimerMarkdown: string;
};

/**
 * Input payload for resolving end-to-end disclaimer status from one agent source.
 */
export type ResolveMetaDisclaimerStatusForUserOptions = {
    userId: number;
    agentPermanentId: string;
    agentSource: string_book;
};

/**
 * Extracts normalized markdown text from `meta.disclaimer`.
 */
export function resolveMetaDisclaimerMarkdown(meta: AgentBasicInformation['meta']): string | null {
    const rawDisclaimer = meta.disclaimer;
    if (typeof rawDisclaimer !== 'string') {
        return null;
    }

    const normalizedDisclaimer = rawDisclaimer.trim();
    return normalizedDisclaimer.length > 0 ? normalizedDisclaimer : null;
}

/**
 * Parses one agent source and resolves its effective disclaimer markdown.
 */
export function resolveMetaDisclaimerMarkdownFromAgentSource(agentSource: string_book): string | null {
    const agentProfile = parseAgentSource(agentSource);
    return resolveMetaDisclaimerMarkdown(agentProfile.meta);
}

/**
 * Builds `UserData.key` for one agent disclaimer agreement record.
 */
export function createMetaDisclaimerUserDataKey(agentPermanentId: string): string {
    return `${META_DISCLAIMER_USER_DATA_KEY_PREFIX}${agentPermanentId}`;
}

/**
 * Computes a stable hash for one disclaimer markdown payload.
 */
export function computeMetaDisclaimerHash(disclaimerMarkdown: string): string {
    return createHash('sha256').update(disclaimerMarkdown).digest('hex');
}

/**
 * Resolves whether the given user already accepted the current disclaimer text.
 */
export async function hasUserAcceptedMetaDisclaimer(options: HasUserAcceptedMetaDisclaimerOptions): Promise<boolean> {
    const { userId, agentPermanentId, disclaimerMarkdown } = options;
    const userDataKey = createMetaDisclaimerUserDataKey(agentPermanentId);
    const storedValue = await getUserDataValue({
        userId,
        key: userDataKey,
    });
    const agreementRecord = normalizeMetaDisclaimerAgreementRecord(storedValue);
    if (!agreementRecord) {
        return false;
    }

    const expectedHash = computeMetaDisclaimerHash(disclaimerMarkdown);
    return agreementRecord.disclaimerHash === expectedHash;
}

/**
 * Persists acceptance for the current disclaimer text.
 */
export async function acceptUserMetaDisclaimer(options: AcceptUserMetaDisclaimerOptions): Promise<void> {
    const { userId, agentPermanentId, disclaimerMarkdown } = options;
    const userDataKey = createMetaDisclaimerUserDataKey(agentPermanentId);
    const agreementRecord: MetaDisclaimerAgreementRecord = {
        version: META_DISCLAIMER_AGREEMENT_VERSION,
        agentPermanentId,
        disclaimerHash: computeMetaDisclaimerHash(disclaimerMarkdown),
        agreedAt: new Date().toISOString(),
    };

    await upsertUserDataValue({
        userId,
        key: userDataKey,
        value: agreementRecord,
    });
}

/**
 * Resolves complete disclaimer status for one user and one agent source.
 */
export async function resolveMetaDisclaimerStatusForUser(
    options: ResolveMetaDisclaimerStatusForUserOptions,
): Promise<MetaDisclaimerStatus> {
    const { userId, agentPermanentId, agentSource } = options;
    const disclaimerMarkdown = resolveMetaDisclaimerMarkdownFromAgentSource(agentSource);

    if (!disclaimerMarkdown) {
        return {
            enabled: false,
            accepted: true,
            markdown: null,
        };
    }

    const accepted = await hasUserAcceptedMetaDisclaimer({
        userId,
        agentPermanentId,
        disclaimerMarkdown,
    });

    return {
        enabled: true,
        accepted,
        markdown: disclaimerMarkdown,
    };
}

/**
 * Validates and normalizes one raw `UserData.value` disclaimer-agreement payload.
 */
function normalizeMetaDisclaimerAgreementRecord(value: unknown): MetaDisclaimerAgreementRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as {
        version?: unknown;
        agentPermanentId?: unknown;
        disclaimerHash?: unknown;
        agreedAt?: unknown;
    };

    if (typeof candidate.version !== 'number' || candidate.version < 1) {
        return null;
    }

    if (typeof candidate.agentPermanentId !== 'string' || candidate.agentPermanentId.trim().length === 0) {
        return null;
    }

    if (typeof candidate.disclaimerHash !== 'string' || candidate.disclaimerHash.trim().length === 0) {
        return null;
    }

    if (typeof candidate.agreedAt !== 'string' || candidate.agreedAt.trim().length === 0) {
        return null;
    }

    return {
        version: candidate.version,
        agentPermanentId: candidate.agentPermanentId,
        disclaimerHash: candidate.disclaimerHash,
        agreedAt: candidate.agreedAt,
    };
}

