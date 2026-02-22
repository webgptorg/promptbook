import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import type { BookCommitment } from '../../../../../src/commitments/_base/BookCommitment';
import type { string_agent_permanent_id, string_agent_url } from '../../../../../src/types/typeAliases';
import { extractAgentReferenceTokens } from './extractAgentReferenceTokens';

/**
 * Prefix used for synthetic route identifiers that point to embedded in-book agents.
 */
const BOOK_SCOPED_AGENT_IDENTIFIER_PREFIX = '__book_agent__~';

/**
 * Regex pattern to match horizontal lines (markdown thematic breaks).
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * Commitment types that can reference other agents.
 */
const AGENT_REFERENCE_COMMITMENT_TYPES: ReadonlySet<BookCommitment> = new Set<BookCommitment>([
    'FROM',
    'IMPORT',
    'IMPORTS',
    'TEAM',
]);

/**
 * Minimal collection shape required for resolving book-scoped agent sources.
 */
type AgentSourceCollection = Pick<AgentCollection, 'getAgentPermanentId' | 'getAgentSource'>;

type IssueTrackingResolver = AgentReferenceResolver & {
    consumeResolutionIssues(): unknown[];
};

/**
 * Resolved context for one route-level agent identifier (regular or embedded).
 */
export type ResolvedBookScopedAgentContext = {
    readonly requestedAgentIdentifier: string;
    readonly resolvedAgentName: string;
    readonly resolvedAgentSource: string_book;
    readonly parentAgentPermanentId: string_agent_permanent_id;
    readonly parentAgentSource: string_book;
    readonly isBookScopedAgent: boolean;
    readonly scopedAgentReferenceResolver: AgentReferenceResolver;
};

/**
 * Parsed descriptor for a synthetic in-book agent identifier.
 */
export type ParsedBookScopedAgentIdentifier = {
    readonly parentAgentIdentifier: string;
    readonly embeddedAgentName: string;
};

/**
 * Creates a synthetic route identifier for an embedded in-book agent.
 *
 * @param parentAgentIdentifier - Parent agent name/permanent id.
 * @param embeddedAgentName - Embedded agent reference name.
 * @returns Route-safe identifier for `/agents/:agentName` URLs.
 */
export function createBookScopedAgentIdentifier(
    parentAgentIdentifier: string,
    embeddedAgentName: string,
): string {
    const normalizedEmbeddedAgentName = normalizeAgentName(embeddedAgentName);
    const encodedParentAgentIdentifier = Buffer.from(parentAgentIdentifier, 'utf8').toString('base64url');
    const encodedEmbeddedAgentName = Buffer.from(normalizedEmbeddedAgentName, 'utf8').toString('base64url');
    return `${BOOK_SCOPED_AGENT_IDENTIFIER_PREFIX}${encodedParentAgentIdentifier}~${encodedEmbeddedAgentName}`;
}

/**
 * Parses a synthetic in-book identifier back into `(parent, embedded)` values.
 *
 * @param agentIdentifier - Incoming route identifier.
 * @returns Parsed identifier or `null` when not book-scoped.
 */
export function parseBookScopedAgentIdentifier(agentIdentifier: string): ParsedBookScopedAgentIdentifier | null {
    if (!agentIdentifier.startsWith(BOOK_SCOPED_AGENT_IDENTIFIER_PREFIX)) {
        return null;
    }

    const serializedParts = agentIdentifier
        .slice(BOOK_SCOPED_AGENT_IDENTIFIER_PREFIX.length)
        .split('~')
        .filter(Boolean);
    if (serializedParts.length !== 2) {
        return null;
    }

    const [encodedParentAgentIdentifier, encodedEmbeddedAgentName] = serializedParts;
    if (!encodedParentAgentIdentifier || !encodedEmbeddedAgentName) {
        return null;
    }

    try {
        const parentAgentIdentifier = Buffer.from(encodedParentAgentIdentifier, 'base64url').toString('utf8');
        const embeddedAgentName = Buffer.from(encodedEmbeddedAgentName, 'base64url').toString('utf8');

        if (!parentAgentIdentifier || !embeddedAgentName) {
            return null;
        }

        return {
            parentAgentIdentifier,
            embeddedAgentName: normalizeAgentName(embeddedAgentName),
        };
    } catch {
        return null;
    }
}

/**
 * Creates a full teammate URL for a book-scoped embedded agent.
 *
 * @param localServerUrl - Current server base URL.
 * @param parentAgentIdentifier - Parent agent permanent id (or name).
 * @param embeddedAgentName - Embedded agent reference name.
 * @returns Absolute agent URL used by TEAM tools.
 */
export function createBookScopedAgentUrl(
    localServerUrl: string,
    parentAgentIdentifier: string,
    embeddedAgentName: string,
): string_agent_url {
    const normalizedServerUrl = localServerUrl.replace(/\/+$/g, '');
    const embeddedIdentifier = createBookScopedAgentIdentifier(parentAgentIdentifier, embeddedAgentName);
    return `${normalizedServerUrl}/agents/${encodeURIComponent(embeddedIdentifier)}` as string_agent_url;
}

/**
 * Extracts additional embedded agents from one source using `---` section boundaries.
 *
 * The first section is treated as the parent agent. Any following section that has a valid
 * title line and at least one commitment is treated as an embedded in-book agent.
 *
 * @param agentSource - Full agent source.
 * @returns Map keyed by normalized embedded agent name.
 */
export function extractEmbeddedAgentSourcesFromBook(agentSource: string_book): Map<string, string_book> {
    const sectionLines: Array<string[]> = [];
    let currentSectionLines: string[] = [];

    for (const line of agentSource.split(/\r?\n/)) {
        if (HORIZONTAL_LINE_PATTERN.test(line)) {
            sectionLines.push(currentSectionLines);
            currentSectionLines = [];
            continue;
        }

        currentSectionLines.push(line);
    }
    sectionLines.push(currentSectionLines);

    const embeddedSources = new Map<string, string_book>();

    for (let sectionIndex = 1; sectionIndex < sectionLines.length; sectionIndex++) {
        const section = sectionLines[sectionIndex];
        if (!section) {
            continue;
        }

        const sectionSource = section.join('\n').trim();
        if (!sectionSource) {
            continue;
        }

        const parsedSection = parseAgentSourceWithCommitments(sectionSource as string_book);
        if (!parsedSection.agentName || parsedSection.commitments.length === 0) {
            continue;
        }

        const normalizedAgentName = normalizeAgentName(parsedSection.agentName);
        embeddedSources.set(normalizedAgentName, sectionSource as string_book);
    }

    return embeddedSources;
}

/**
 * Creates a resolver that first maps compact references to embedded in-book agents,
 * then delegates unresolved references to a fallback resolver.
 *
 * @param options - Parent source context and fallback resolver.
 * @returns Scoped resolver for one book.
 */
export function createBookScopedAgentReferenceResolver(options: {
    readonly parentAgentSource: string_book;
    readonly parentAgentIdentifier: string;
    readonly localServerUrl: string;
    readonly fallbackResolver?: AgentReferenceResolver;
}): AgentReferenceResolver {
    const { parentAgentSource, parentAgentIdentifier, localServerUrl, fallbackResolver } = options;
    const embeddedSources = extractEmbeddedAgentSourcesFromBook(parentAgentSource);

    const scopedResolver: AgentReferenceResolver & Partial<IssueTrackingResolver> = {
        resolveCommitmentContent: async (commitmentType, content) => {
            let resolvedContent = content;

            if (AGENT_REFERENCE_COMMITMENT_TYPES.has(commitmentType as BookCommitment) && content) {
                const chunks: Array<string> = [];
                let previousIndex = 0;

                for (const tokenMatch of extractAgentReferenceTokens(content)) {
                    const tokenReference = tokenMatch.reference.trim();
                    const normalizedTokenReference = normalizeAgentName(tokenReference);

                    chunks.push(content.slice(previousIndex, tokenMatch.index));
                    previousIndex = tokenMatch.index + tokenMatch.length;

                    if (!tokenReference || !embeddedSources.has(normalizedTokenReference)) {
                        chunks.push(tokenMatch.token);
                        continue;
                    }

                    chunks.push(
                        createBookScopedAgentUrl(localServerUrl, parentAgentIdentifier, normalizedTokenReference),
                    );
                }

                chunks.push(content.slice(previousIndex));
                resolvedContent = chunks.join('');
            }

            if (!fallbackResolver) {
                return resolvedContent;
            }

            return fallbackResolver.resolveCommitmentContent(commitmentType, resolvedContent);
        },
    };

    if (isIssueTrackingResolver(fallbackResolver)) {
        scopedResolver.consumeResolutionIssues = () => fallbackResolver.consumeResolutionIssues();
    }

    return scopedResolver;
}

/**
 * Checks whether a resolver implementation exposes tracked-resolution issues.
 */
function isIssueTrackingResolver(resolver?: AgentReferenceResolver): resolver is IssueTrackingResolver {
    return Boolean(resolver && typeof (resolver as Partial<IssueTrackingResolver>).consumeResolutionIssues === 'function');
}

/**
 * Resolves a route-level `agentName` (regular or embedded) to concrete source and scoped resolver.
 *
 * @param options - Source collection, route identifier, and resolver dependencies.
 * @returns Fully resolved context used by profile/chat/model-requirements routes.
 */
export async function resolveBookScopedAgentContext(options: {
    readonly collection: AgentSourceCollection;
    readonly agentIdentifier: string;
    readonly localServerUrl: string;
    readonly fallbackResolver?: AgentReferenceResolver;
}): Promise<ResolvedBookScopedAgentContext> {
    const { collection, agentIdentifier, localServerUrl, fallbackResolver } = options;

    const parsedIdentifier = parseBookScopedAgentIdentifier(agentIdentifier);

    if (!parsedIdentifier) {
        const parentAgentPermanentId = await collection.getAgentPermanentId(agentIdentifier);
        const parentAgentSource = await collection.getAgentSource(parentAgentPermanentId);
        const parsedParentProfile = parseAgentSource(parentAgentSource);
        const resolvedAgentName = parsedParentProfile.agentName || normalizeAgentName(agentIdentifier);

        return {
            requestedAgentIdentifier: agentIdentifier,
            resolvedAgentName,
            resolvedAgentSource: parentAgentSource,
            parentAgentPermanentId,
            parentAgentSource,
            isBookScopedAgent: false,
            scopedAgentReferenceResolver: createBookScopedAgentReferenceResolver({
                parentAgentSource,
                parentAgentIdentifier: parentAgentPermanentId,
                localServerUrl,
                fallbackResolver,
            }),
        };
    }

    const parentAgentPermanentId = await collection.getAgentPermanentId(parsedIdentifier.parentAgentIdentifier);
    const parentAgentSource = await collection.getAgentSource(parentAgentPermanentId);
    const embeddedSources = extractEmbeddedAgentSourcesFromBook(parentAgentSource);
    const embeddedSource = embeddedSources.get(parsedIdentifier.embeddedAgentName);

    if (!embeddedSource) {
        throw new Error(
            `Embedded agent "${parsedIdentifier.embeddedAgentName}" not found in source of "${parsedIdentifier.parentAgentIdentifier}".`,
        );
    }

    const parsedEmbeddedProfile = parseAgentSource(embeddedSource);
    const resolvedAgentName = parsedEmbeddedProfile.agentName || parsedIdentifier.embeddedAgentName;

    return {
        requestedAgentIdentifier: agentIdentifier,
        resolvedAgentName,
        resolvedAgentSource: embeddedSource,
        parentAgentPermanentId,
        parentAgentSource,
        isBookScopedAgent: true,
        scopedAgentReferenceResolver: createBookScopedAgentReferenceResolver({
            parentAgentSource,
            parentAgentIdentifier: parentAgentPermanentId,
            localServerUrl,
            fallbackResolver,
        }),
    };
}
