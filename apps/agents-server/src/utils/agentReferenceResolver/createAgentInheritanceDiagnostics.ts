import { CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES } from '../../../../../servers';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { isVoidPseudoAgentReference } from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import type {
    string_agent_permanent_id,
    string_agent_url,
    string_book,
} from '../../../../../src/_packages/types.index';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import { isValidAgentUrl } from '../../../../../src/utils/validators/url/isValidAgentUrl';
import { getEffectiveExplicitFromCommitment, type ExplicitFromCommitment } from '../explicitFromCommitment';
import {
    createLocalAgentUrl,
    normalizeLocalServerUrls,
    resolveLocalAgentRouteReference,
} from '../localAgentRouteReferences';
import { createBookScopedAgentReferenceResolver, resolveBookScopedAgentContext } from './bookScopedAgentReferences';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';
import type { AgentReferenceDiagnostic } from './createUnresolvedAgentReferenceDiagnostics';

/**
 * Maximum number of local inheritance links inspected while preparing Book editor diagnostics.
 *
 * A real local cycle is found much sooner, while this bound keeps an unexpectedly deep graph from delaying the editor.
 *
 * @private utility of Agents Server inheritance diagnostics
 */
const MAX_LOCAL_INHERITANCE_DIAGNOSTIC_DEPTH = 100;

/**
 * Monaco marker source used for invalid root and circular inheritance warnings.
 *
 * @private utility of Agents Server inheritance diagnostics
 */
const AGENT_INHERITANCE_DIAGNOSTIC_SOURCE = 'agent-inheritance';

/**
 * Dependencies needed to validate the effective local `FROM` chain of one in-editor book.
 *
 * @private utility of Agents Server inheritance diagnostics
 */
export type CreateAgentInheritanceDiagnosticsOptions = {
    /**
     * Current unsaved source from the Book editor.
     */
    readonly agentSource: string_book;

    /**
     * Stable permanent id of the agent being edited.
     */
    readonly agentPermanentId: string_agent_permanent_id;

    /**
     * Collection used to load local ancestors and their Book sources.
     */
    readonly collection: AgentCollection;

    /**
     * Current server origin used to build and recognize local agent URLs.
     */
    readonly localServerUrl: string;
};

/**
 * One local agent source participating in an inheritance-chain walk.
 *
 * @private utility of Agents Server inheritance diagnostics
 */
type LocalInheritanceNode = {
    /**
     * Editable source before `FROM` materialization.
     */
    readonly agentSource: string_book;

    /**
     * Canonical local route used to identify the node in the chain.
     */
    readonly canonicalAgentUrl: string_agent_url;

    /**
     * Friendly title displayed in a cycle warning.
     */
    readonly title: string;

    /**
     * Resolver scoped to embedded agents declared by this Book.
     */
    readonly agentReferenceResolver: AgentReferenceResolver;

    /**
     * Last explicit parent declaration, when the Book has one.
     */
    readonly effectiveFromCommitment: ExplicitFromCommitment | undefined;

    /**
     * Whether this source is the server's root Adam agent.
     */
    readonly isAdamAgent: boolean;
};

/**
 * Creates Book editor warnings for a circular local inheritance chain and for an Adam source that is not rooted in
 * `Null`/`Void`.
 *
 * The runtime remains the authority that materializes local and federated sources. This intentionally lightweight
 * graph walk only follows local `FROM` links, which is enough to point an author at the exact Book line before a
 * cycle can make runtime resolution fail.
 *
 * @param options - Current editable source and local-server dependencies.
 * @returns Warning markers suitable for the Book editor.
 *
 * @private utility of Agents Server Book editor diagnostics
 */
export async function createAgentInheritanceDiagnostics(
    options: CreateAgentInheritanceDiagnosticsOptions,
): Promise<Array<AgentReferenceDiagnostic>> {
    const { agentSource, agentPermanentId, collection, localServerUrl } = options;
    const normalizedLocalServerUrl = localServerUrl.replace(/\/+$/g, '');
    const baseAgentReferenceResolver = await createServerAgentReferenceResolver({
        agentCollection: collection,
        localServerUrl: normalizedLocalServerUrl,
    });
    const adamCanonicalAgentUrl = await resolveAdamCanonicalAgentUrl(collection, normalizedLocalServerUrl);
    const rootNode = createRootInheritanceNode({
        agentSource,
        agentPermanentId,
        localServerUrl: normalizedLocalServerUrl,
        adamCanonicalAgentUrl,
        baseAgentReferenceResolver,
    });
    const adamDiagnostics = createAdamRootDiagnostics(rootNode);
    const cycleDiagnostic = await createCycleDiagnostic({
        rootNode,
        collection,
        localServerUrl: normalizedLocalServerUrl,
        adamCanonicalAgentUrl,
        baseAgentReferenceResolver,
    });

    return cycleDiagnostic ? [...adamDiagnostics, cycleDiagnostic] : adamDiagnostics;
}

/**
 * Resolves Adam's canonical current route from its well-known name.
 *
 * @param collection - Collection containing local core agents.
 * @param localServerUrl - Current server origin.
 * @returns Canonical Adam route or `null` when the core agent is missing.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
async function resolveAdamCanonicalAgentUrl(
    collection: Pick<AgentCollection, 'getAgentPermanentId'>,
    localServerUrl: string,
): Promise<string_agent_url | null> {
    try {
        const adamPermanentId = await collection.getAgentPermanentId(CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES.ADAM);
        return createLocalAgentUrl(localServerUrl, adamPermanentId);
    } catch {
        return null;
    }
}

/**
 * Creates the first graph node from the source currently being edited rather than its last saved database version.
 *
 * @param options - Current source and dependencies shared by the diagnostics pass.
 * @returns Root node of the local inheritance walk.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
function createRootInheritanceNode(options: {
    readonly agentSource: string_book;
    readonly agentPermanentId: string_agent_permanent_id;
    readonly localServerUrl: string;
    readonly adamCanonicalAgentUrl: string_agent_url | null;
    readonly baseAgentReferenceResolver: AgentReferenceResolver;
}): LocalInheritanceNode {
    const { agentSource, agentPermanentId, localServerUrl, adamCanonicalAgentUrl, baseAgentReferenceResolver } =
        options;
    const canonicalAgentUrl = createLocalAgentUrl(localServerUrl, agentPermanentId);
    const title = readAgentSourceTitle(agentSource, agentPermanentId);

    return {
        agentSource,
        canonicalAgentUrl,
        title,
        agentReferenceResolver: createBookScopedAgentReferenceResolver({
            parentAgentSource: agentSource,
            parentAgentIdentifier: agentPermanentId,
            localServerUrl,
            fallbackResolver: baseAgentReferenceResolver,
        }),
        effectiveFromCommitment: getEffectiveExplicitFromCommitment(agentSource),
        isAdamAgent:
            canonicalAgentUrl === adamCanonicalAgentUrl ||
            title.trim().toLowerCase() === CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES.ADAM,
    };
}

/**
 * Creates the Adam-specific warning when the root agent does not explicitly inherit from `Null`/`Void`.
 *
 * @param node - Root node being edited.
 * @returns One warning for invalid Adam ancestry, otherwise an empty list.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
function createAdamRootDiagnostics(node: LocalInheritanceNode): Array<AgentReferenceDiagnostic> {
    if (node.isAdamAgent && !isExplicitNoParentCommitment(node.effectiveFromCommitment)) {
        return [
            createInheritanceMarker(
                node.agentSource,
                node.effectiveFromCommitment,
                'The core `Adam` agent must explicitly use `FROM @Null` (or the equivalent `FROM @Void`) so it remains the root of the inheritance chain.',
            ),
        ];
    }

    return [];
}

/**
 * Checks whether an effective `FROM` commitment explicitly opts out of inheritance.
 *
 * @param fromCommitment - Effective parent declaration, if present.
 * @returns True only for an explicit `Null`/`Void` parent.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
function isExplicitNoParentCommitment(fromCommitment: ExplicitFromCommitment | undefined): boolean {
    return Boolean(fromCommitment && isVoidPseudoAgentReference(fromCommitment.content));
}

/**
 * Walks the local parent chain and creates one warning when it reaches a previously visited agent.
 *
 * @param options - Root node and dependencies shared by the graph walk.
 * @returns Cycle warning marker or `null` when the chain is safe or leaves the local server.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
async function createCycleDiagnostic(options: {
    readonly rootNode: LocalInheritanceNode;
    readonly collection: AgentCollection;
    readonly localServerUrl: string;
    readonly adamCanonicalAgentUrl: string_agent_url | null;
    readonly baseAgentReferenceResolver: AgentReferenceResolver;
}): Promise<AgentReferenceDiagnostic | null> {
    const { rootNode } = options;
    const inheritancePath: Array<LocalInheritanceNode> = [rootNode];
    let currentNode = rootNode;

    for (let depth = 0; depth < MAX_LOCAL_INHERITANCE_DIAGNOSTIC_DEPTH; depth++) {
        const parentNode = await resolveLocalParentNode(currentNode, options);
        if (!parentNode) {
            return null;
        }

        const cycleStartIndex = inheritancePath.findIndex(
            (pathNode) => pathNode.canonicalAgentUrl === parentNode.canonicalAgentUrl,
        );
        if (cycleStartIndex !== -1) {
            const cycleTitles = [...inheritancePath.slice(cycleStartIndex), parentNode]
                .map((cycleNode) => `\`${cycleNode.title}\``)
                .join(' → ');

            return createInheritanceMarker(
                rootNode.agentSource,
                rootNode.effectiveFromCommitment,
                `Cyclic \`FROM\` inheritance detected: ${cycleTitles}. Change one of these parent references to break the cycle.`,
            );
        }

        inheritancePath.push(parentNode);
        currentNode = parentNode;
    }

    return null;
}

/**
 * Resolves one node's effective local parent, or returns `null` for explicit no-parent, missing, or remote parents.
 *
 * @param node - Node whose parent should be followed.
 * @param options - Shared local resolution dependencies.
 * @returns The next local node, or `null` when the diagnostic walk should stop.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
async function resolveLocalParentNode(
    node: LocalInheritanceNode,
    options: {
        readonly collection: AgentCollection;
        readonly localServerUrl: string;
        readonly adamCanonicalAgentUrl: string_agent_url | null;
        readonly baseAgentReferenceResolver: AgentReferenceResolver;
    },
): Promise<LocalInheritanceNode | null> {
    const { effectiveFromCommitment } = node;

    if (!effectiveFromCommitment) {
        if (node.isAdamAgent) {
            return null;
        }

        const adamAgentUrl = createLocalAgentUrl(
            options.localServerUrl,
            CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES.ADAM,
        );
        return loadLocalInheritanceNode(adamAgentUrl, options);
    }

    if (!effectiveFromCommitment.content || isVoidPseudoAgentReference(effectiveFromCommitment.content)) {
        return null;
    }

    let resolvedParentReference: string;
    try {
        resolvedParentReference = await node.agentReferenceResolver.resolveCommitmentContent(
            'FROM',
            effectiveFromCommitment.content,
        );
    } catch {
        return null;
    }

    if (!resolvedParentReference || isVoidPseudoAgentReference(resolvedParentReference)) {
        return null;
    }

    if (!isValidAgentUrl(resolvedParentReference)) {
        return null;
    }

    return loadLocalInheritanceNode(resolvedParentReference as string_agent_url, options);
}

/**
 * Loads one local parent node through the same book-scoped context used by the regular runtime resolver.
 *
 * @param parentAgentUrl - Resolved parent URL to inspect.
 * @param options - Shared local resolution dependencies.
 * @returns Loaded local node, or `null` for a remote/unavailable parent.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
async function loadLocalInheritanceNode(
    parentAgentUrl: string_agent_url,
    options: {
        readonly collection: AgentCollection;
        readonly localServerUrl: string;
        readonly adamCanonicalAgentUrl: string_agent_url | null;
        readonly baseAgentReferenceResolver: AgentReferenceResolver;
    },
): Promise<LocalInheritanceNode | null> {
    const localRouteReference = resolveLocalAgentRouteReference(
        parentAgentUrl,
        normalizeLocalServerUrls([options.localServerUrl]),
        [],
    );
    if (!localRouteReference) {
        return null;
    }

    try {
        const resolvedAgentContext = await resolveBookScopedAgentContext({
            collection: options.collection,
            agentIdentifier: localRouteReference.agentIdentifier,
            localServerUrl: options.localServerUrl,
            fallbackResolver: options.baseAgentReferenceResolver,
        });
        const title = readAgentSourceTitle(
            resolvedAgentContext.unresolvedAgentSource,
            resolvedAgentContext.resolvedAgentName,
        );

        return {
            agentSource: resolvedAgentContext.unresolvedAgentSource,
            canonicalAgentUrl: resolvedAgentContext.canonicalAgentUrl,
            title,
            agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
            effectiveFromCommitment: getEffectiveExplicitFromCommitment(resolvedAgentContext.unresolvedAgentSource),
            isAdamAgent:
                resolvedAgentContext.canonicalAgentUrl === options.adamCanonicalAgentUrl ||
                title.trim().toLowerCase() === CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES.ADAM,
        };
    } catch {
        return null;
    }
}

/**
 * Reads a Book's visible title for friendly diagnostics, with a stable fallback for incomplete editor content.
 *
 * @param agentSource - Source to inspect.
 * @param fallbackTitle - Stable fallback when the source has no title yet.
 * @returns First non-empty source line or the fallback title.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
function readAgentSourceTitle(agentSource: string_book, fallbackTitle: string): string {
    for (const line of agentSource.split(/\r?\n/)) {
        const title = line.trim();
        if (title) {
            return title;
        }
    }

    return fallbackTitle;
}

/**
 * Creates a warning marker on the effective `FROM` keyword, or on the title when inheritance is implicit.
 *
 * @param agentSource - Source whose marker should be displayed.
 * @param fromCommitment - Effective explicit `FROM`, if one exists.
 * @param message - Human-readable warning shown by Monaco.
 * @returns Monaco-compatible warning marker.
 *
 * @private utility of `createAgentInheritanceDiagnostics`
 */
function createInheritanceMarker(
    agentSource: string_book,
    fromCommitment: ExplicitFromCommitment | undefined,
    message: string,
): AgentReferenceDiagnostic {
    const sourceLines = agentSource.split(/\r?\n/);

    if (fromCommitment) {
        const sourceLine = sourceLines[fromCommitment.lineIndex] || '';
        const keywordIndex = Math.max(0, sourceLine.indexOf('FROM'));

        return {
            startLineNumber: fromCommitment.lineIndex + 1,
            startColumn: keywordIndex + 1,
            endLineNumber: fromCommitment.lineIndex + 1,
            endColumn: keywordIndex + 'FROM'.length + 1,
            message,
            source: AGENT_INHERITANCE_DIAGNOSTIC_SOURCE,
            severity: 'warning',
        };
    }

    const titleLineIndex = sourceLines.findIndex((sourceLine) => sourceLine.trim().length > 0);
    const sourceLine = sourceLines[titleLineIndex] || '';

    return {
        startLineNumber: Math.max(0, titleLineIndex) + 1,
        startColumn: 1,
        endLineNumber: Math.max(0, titleLineIndex) + 1,
        endColumn: Math.max(2, sourceLine.length + 1),
        message,
        source: AGENT_INHERITANCE_DIAGNOSTIC_SOURCE,
        severity: 'warning',
    };
}
