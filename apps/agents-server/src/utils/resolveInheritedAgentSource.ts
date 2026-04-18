import type { string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { padBook } from '../../../../src/book-2.0/agent-source/padBook';
import { isVoidPseudoAgentReference } from '../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import { ParseError } from '../../../../src/errors/ParseError';
import { UnexpectedError } from '../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { isValidAgentUrl } from '../../../../src/utils/validators/url/isValidAgentUrl';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';
import {
    type AgentReferenceResolutionIssue,
    consumeAgentReferenceResolutionIssues,
} from './agentReferenceResolver/AgentReferenceResolutionIssue';
import { type ImportAgentOptions } from './importAgent';
import { importAgentWithFallback } from './importAgentWithFallback';

/**
 * Gets the corpus of an agent source (removes title and trailing status)
 *
 * @param agentSource The agent source
 * @returns The agent source corpus
 */
function getAgentSourceCorpus(agentSource: string_book): string {
    // Remove trailing OPEN or CLOSED if present
    const agentSourceWithoutStatus = agentSource.replace(/\n?(OPEN|CLOSED)\s*$/i, '') as string_book;
    // <- TODO: [🈲] Simple and encapsulated way to get book corpus

    // Remove the first line (title) from agent source
    const agentSourceCorpus = spaceTrim(agentSourceWithoutStatus.replace(/^.*$/m, ''));
    // <- TODO: [🈲] Simple and encapsulated way to get book corpus

    return agentSourceCorpus;
}

/**
 * Formats a resolver issue into a visible NOTE line in resolved agent source.
 *
 * @param issue - Tracked missing-reference issue.
 * @returns Single-line NOTE statement.
 */
function formatResolutionIssueAsNote(issue: AgentReferenceResolutionIssue): string {
    const commitmentType = issue.commitmentType === 'IMPORTS' ? 'IMPORT' : issue.commitmentType;

    if (commitmentType === 'FROM') {
        return `NOTE Referenced agent "${issue.reference}" in FROM commitment was not found. Inheritance skipped.`;
    }

    if (commitmentType === 'IMPORT') {
        return `NOTE Referenced agent "${issue.reference}" in IMPORT commitment was not found. Import skipped.`;
    }

    if (commitmentType === 'TEAM') {
        return `NOTE Referenced agent "${issue.reference}" in TEAM commitment was not found. Teammate disabled.`;
    }

    return `NOTE Referenced agent "${issue.reference}" in ${commitmentType} commitment was not found.`;
}

/**
 * Appends NOTE lines for unresolved references while avoiding duplicates.
 *
 * @param targetChunks - Output chunks being assembled for the resolved book.
 * @param issues - Missing-reference issues to materialize into NOTE lines.
 */
function appendResolutionIssueNotes(
    targetChunks: Array<string>,
    issues: ReadonlyArray<AgentReferenceResolutionIssue>,
): void {
    const seenIssueKeys = new Set<string>();

    for (const issue of issues) {
        const key = `${issue.commitmentType}:${issue.reference}`.toLowerCase();
        if (seenIssueKeys.has(key)) {
            continue;
        }

        seenIssueKeys.add(key);
        targetChunks.push(formatResolutionIssueAsNote(issue), '');
    }
}

/**
 * Inserts NOTE lines right after the title line in a book.
 *
 * @param agentSource - Original agent source.
 * @param notes - NOTE lines to insert.
 * @returns Updated book with notes placed after the title.
 */
function insertNotesAfterTitle(agentSource: string_book, notes: ReadonlyArray<string>): string_book {
    if (notes.length === 0) {
        return agentSource;
    }

    const sourceLines = spaceTrim(agentSource).split(/\r?\n/);
    const titleLine = sourceLines[0] || '';
    const restLines = sourceLines.slice(1);
    const nextLines = [titleLine, '', ...notes, '', ...restLines];

    return padBook(validateBook(nextLines.join('\n')));
}

/**
 * Returns the last explicit single-line commitment content for one commitment type.
 *
 * This lightweight parser is intentionally limited to the subset needed by
 * inheritance resolution so it stays safe to bundle into the Next.js proxy path.
 *
 * @param agentSource - Raw book source.
 * @param commitmentType - Commitment keyword to search for.
 * @returns Trimmed commitment content, empty string for a blank explicit commitment, or `undefined` when absent.
 */
function getLastSingleLineCommitmentContent(agentSource: string_book, commitmentType: 'FROM'): string | undefined {
    const commitmentPrefix = `${commitmentType} `;
    const lines = agentSource.split(/\r?\n/);
    let hasSeenTitle = false;
    let isInsideCodeBlock = false;
    let matchedContent: string | undefined;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!hasSeenTitle) {
            if (!trimmedLine) {
                continue;
            }

            hasSeenTitle = true;
            continue;
        }

        if (trimmedLine.startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;
            continue;
        }

        if (isInsideCodeBlock) {
            continue;
        }

        if (trimmedLine === commitmentType) {
            matchedContent = '';
            continue;
        }

        if (trimmedLine.startsWith(commitmentPrefix)) {
            matchedContent = trimmedLine.slice(commitmentPrefix.length).trim();
        }
    }

    return matchedContent;
}

/**
 * Resolves the effective `FROM` parent URL using only lightweight commitment parsing.
 *
 * @param rawAgentSource - Original source used for diagnostics.
 * @param agentReferenceResolver - Optional compact-reference resolver.
 * @returns Valid parent URL, explicit `null` for `FROM VOID`/blank `FROM`, or `undefined` when `FROM` is absent.
 */
async function resolveParentAgentUrlFromCommitments(
    rawAgentSource: string_book,
    agentReferenceResolver?: AgentReferenceResolver,
): Promise<string_agent_url | null | undefined> {
    const explicitFromContent = getLastSingleLineCommitmentContent(rawAgentSource, 'FROM');

    if (explicitFromContent === undefined) {
        return undefined;
    }

    let resolvedParentReference = explicitFromContent.trim();

    if (agentReferenceResolver && resolvedParentReference) {
        resolvedParentReference = (
            await agentReferenceResolver.resolveCommitmentContent('FROM', resolvedParentReference)
        ).trim();
    }

    if (!resolvedParentReference || isVoidPseudoAgentReference(resolvedParentReference)) {
        return null;
    }

    if (!isValidAgentUrl(resolvedParentReference)) {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Invalid parent agent URL in FROM "${resolvedParentReference}" commitment:

                    \`\`\`book
                    ${block(rawAgentSource)}
                    \`\`\`
            
                `,
            ),
        );
    }

    return resolvedParentReference as string_agent_url;
}

/**
 * Shared options for resolving one agent source with inheritance and imports applied.
 */
type ResolveInheritedAgentSourceOptions = ImportAgentOptions & {
    /**
     * The URL of the Adam agent to use as the default ancestor
     *
     * @default 'https://core.ptbk.io/agents/adam'
     */
    readonly adamAgentUrl?: string_agent_url;
    /**
     * Custom resolver used to expand compact agent references.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;
    /**
     * Canonical URL of the currently resolved agent.
     */
    readonly currentAgentUrl?: string_agent_url;
    /**
     * Additional equivalent URLs that should be treated as the current agent while detecting cycles.
     */
    readonly currentAgentAliases?: ReadonlyArray<string_agent_url>;
    /**
     * Already visited agent URLs in the current resolution stack.
     */
    readonly inheritancePath?: ReadonlyArray<string_agent_url>;
    /**
     * Retry configuration used for federated imported-agent loading.
     */
    readonly federatedAgentImportConfiguration?: FederatedAgentImportConfiguration;
};

/**
 * Parent inheritance state derived before rewriting the source body.
 */
type ResolvedParentAgentContext = {
    /**
     * Effective parent URL after resolving explicit `FROM`, `FROM VOID`, or implicit Adam fallback.
     */
    readonly parentAgentUrl: string_agent_url | null;

    /**
     * Parent source body without title/status, ready to be embedded into the child source.
     */
    readonly parentAgentSourceCorpus: string | null;

    /**
     * Unresolved compact-reference issues captured while resolving `FROM`.
     */
    readonly fromResolutionIssues: Array<AgentReferenceResolutionIssue>;
};

/**
 * Shared import settings reused for parent and imported-agent loading.
 */
type AgentImportContext = {
    /**
     * Adam agent URL used as the implicit default ancestor.
     */
    readonly adamAgentUrl: string_agent_url;

    /**
     * Resolver used to expand compact references in commitments.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;

    /**
     * Retry policy used for federated imports.
     */
    readonly federatedAgentImportConfiguration: FederatedAgentImportConfiguration;

    /**
     * Import options propagated to downstream agent loading.
     */
    readonly importAgentOptions: ImportAgentOptions;

    /**
     * Original resolution options used for cycle detection.
     */
    readonly resolutionOptions?: ResolveInheritedAgentSourceOptions;
};

/**
 * Result of rewriting the source line by line before final validation.
 */
type ResolvedAgentSourceBuild = {
    /**
     * Rewritten source lines.
     */
    readonly agentSourceChunks: Array<string>;

    /**
     * Whether one explicit `FROM ...` line was materialized during rewriting.
     */
    readonly isFromResolved: boolean;

    /**
     * Remaining unresolved `FROM` issues that still need to be turned into NOTE lines.
     */
    readonly fromResolutionIssues: Array<AgentReferenceResolutionIssue>;
};

/**
 * Result of handling one explicit `FROM ...` line.
 */
type ResolvedFromCommitmentLine = {
    /**
     * Output lines produced for the `FROM` commitment.
     */
    readonly agentSourceChunks: Array<string>;

    /**
     * Remaining `FROM` issues after the line was handled.
     */
    readonly fromResolutionIssues: Array<AgentReferenceResolutionIssue>;
};

/**
 * Normalizes agent URLs used for cycle detection and lineage reporting.
 *
 * @param agentUrl - Raw agent URL.
 * @returns URL without trailing slashes.
 */
function normalizeAgentUrl(agentUrl: string_agent_url): string_agent_url {
    return agentUrl.replace(/\/+$/g, '') as string_agent_url;
}

/**
 * Builds the current resolution lineage ending with the agent being resolved now.
 *
 * @param options - Resolution options with current agent metadata.
 * @returns Ordered lineage without empty values.
 */
function createResolutionLineage(options?: ResolveInheritedAgentSourceOptions): Array<string_agent_url> {
    const lineage = [...(options?.inheritancePath || [])];

    if (options?.currentAgentUrl) {
        lineage.push(options.currentAgentUrl);
    }

    for (const alias of options?.currentAgentAliases || []) {
        lineage.push(alias);
    }

    return [...new Set(lineage.map(normalizeAgentUrl))];
}

/**
 * Creates the shared import context used throughout one resolution pass.
 *
 * @param options - Resolution options passed to `resolveInheritedAgentSource`.
 * @returns Normalized shared import context.
 */
function createAgentImportContext(options?: ResolveInheritedAgentSourceOptions): AgentImportContext {
    return {
        adamAgentUrl: options?.adamAgentUrl || 'https://core.ptbk.io/agents/adam',
        agentReferenceResolver: options?.agentReferenceResolver,
        federatedAgentImportConfiguration:
            options?.federatedAgentImportConfiguration || DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
        importAgentOptions: {
            recursionLevel: options?.recursionLevel || 0,
            inheritancePath: createResolutionLineage(options),
        },
        resolutionOptions: options,
    };
}

/**
 * Computes the effective parent URL after applying explicit `FROM` and Adam fallback rules.
 *
 * @param resolvedParentAgentUrl - Parent URL derived from lightweight commitment parsing.
 * @param hasExplicitFromCommitment - Whether the source explicitly declared `FROM`.
 * @param adamAgentUrl - Default Adam ancestor URL.
 * @param currentAgentUrl - Canonical URL of the source being resolved.
 * @param agentSource - Raw source used for unexpected diagnostics.
 * @returns Effective parent URL or `null` when inheritance is disabled.
 */
function determineParentAgentUrl(
    resolvedParentAgentUrl: string_agent_url | null | undefined,
    hasExplicitFromCommitment: boolean,
    adamAgentUrl: string_agent_url,
    currentAgentUrl?: string_agent_url,
    agentSource?: string_book,
): string_agent_url | null {
    if (isValidAgentUrl(resolvedParentAgentUrl)) {
        return resolvedParentAgentUrl as string_agent_url;
    }

    if (resolvedParentAgentUrl === null && hasExplicitFromCommitment) {
        return null;
    }

    if (resolvedParentAgentUrl === undefined || resolvedParentAgentUrl === null) {
        return currentAgentUrl && normalizeAgentUrl(currentAgentUrl) === normalizeAgentUrl(adamAgentUrl)
            ? null
            : adamAgentUrl;
    }

    throw new ParseError(
        spaceTrim(
            (block) => `
                Invalid parent agent URL in FROM "${resolvedParentAgentUrl}" commitment:

                \`\`\`book
                ${block(agentSource || '')}
                \`\`\`
            `,
        ),
    );
}

/**
 * Imports one referenced agent and returns only its body content ready to be embedded as a NOTE block.
 *
 * @param agentUrl - Canonical referenced agent URL.
 * @param commitmentType - Commitment that introduced the reference.
 * @param context - Shared import context for the current resolution pass.
 * @returns Imported source body without title/status.
 */
async function importAgentCorpus(
    agentUrl: string_agent_url,
    commitmentType: 'FROM' | 'IMPORT',
    context: AgentImportContext,
): Promise<string> {
    assertNoResolutionCycle(agentUrl, commitmentType, context.resolutionOptions);

    const importedAgentSource = await importAgentWithFallback(
        agentUrl,
        context.importAgentOptions,
        context.federatedAgentImportConfiguration,
    );

    return getAgentSourceCorpus(importedAgentSource as string_book);
}

/**
 * Resolves the effective parent state before the source body is rewritten.
 *
 * @param agentSource - Raw child agent source.
 * @param context - Shared import context for the current resolution pass.
 * @returns Parent URL, imported parent body, and unresolved `FROM` issues.
 */
async function resolveParentAgentContext(
    agentSource: string_book,
    context: AgentImportContext,
): Promise<ResolvedParentAgentContext> {
    const explicitFromContent = getLastSingleLineCommitmentContent(agentSource, 'FROM');
    const hasExplicitFromCommitment = explicitFromContent !== undefined;
    const resolvedParentAgentUrl = await resolveParentAgentUrlFromCommitments(
        agentSource,
        context.agentReferenceResolver,
    );
    const fromResolutionIssues = consumeAgentReferenceResolutionIssues(context.agentReferenceResolver).filter(
        (issue) => issue.commitmentType === 'FROM',
    );
    const parentAgentUrl = determineParentAgentUrl(
        resolvedParentAgentUrl,
        hasExplicitFromCommitment,
        context.adamAgentUrl,
        context.resolutionOptions?.currentAgentUrl,
        agentSource,
    );
    const parentAgentSourceCorpus = parentAgentUrl ? await importAgentCorpus(parentAgentUrl, 'FROM', context) : null;

    return {
        parentAgentUrl,
        parentAgentSourceCorpus,
        fromResolutionIssues,
    };
}

/**
 * Formats one embedded agent body into the NOTE block used by inheritance/import resolution.
 *
 * @param noteLine - First NOTE line describing the embedded source.
 * @param sourceCorpus - Imported source body to embed.
 * @returns Multi-line NOTE block.
 */
function createEmbeddedAgentSourceNote(noteLine: string, sourceCorpus: string): string {
    return spaceTrim(
        (block) => `

            ${noteLine}
            ${block(sourceCorpus)}

            NOTE ===========
    `,
    );
}

/**
 * Resolves one `IMPORT ...` line into embedded source or leaves non-agent imports untouched.
 *
 * @param line - Current source line.
 * @param context - Shared import context for the current resolution pass.
 * @returns Output lines replacing the original line.
 */
async function resolveImportCommitmentLine(line: string, context: AgentImportContext): Promise<Array<string>> {
    const rawImportedUrlOrPath = line.trim().substring('IMPORT '.length).trim();
    let importedUrlOrPath = rawImportedUrlOrPath;
    let importResolutionIssues: Array<AgentReferenceResolutionIssue> = [];

    if (context.agentReferenceResolver && rawImportedUrlOrPath) {
        try {
            importedUrlOrPath = await context.agentReferenceResolver.resolveCommitmentContent(
                'IMPORT',
                rawImportedUrlOrPath,
            );
        } catch (error) {
            console.warn('[AgentReferenceResolver] Failed to resolve IMPORT commitment references:', error);
        } finally {
            importResolutionIssues = consumeAgentReferenceResolutionIssues(context.agentReferenceResolver).filter(
                (issue) => issue.commitmentType === 'IMPORT' || issue.commitmentType === 'IMPORTS',
            );
        }
    }

    const resolvedChunks: Array<string> = [];
    appendResolutionIssueNotes(resolvedChunks, importResolutionIssues);

    if (!importedUrlOrPath) {
        return resolvedChunks;
    }

    if (!isValidAgentUrl(importedUrlOrPath)) {
        resolvedChunks.push(line);
        return resolvedChunks;
    }

    const importedAgentUrl = importedUrlOrPath as string_agent_url;
    const importedAgentSourceCorpus = await importAgentCorpus(importedAgentUrl, 'IMPORT', context);

    resolvedChunks.push(
        createEmbeddedAgentSourceNote(`NOTE Imported from ${importedAgentUrl}`, importedAgentSourceCorpus),
        '', // <- Note: Add an extra newline for separation
    );

    return resolvedChunks;
}

/**
 * Resolves one explicit `FROM ...` line into inherited content or fallback NOTE lines.
 *
 * @param line - Current source line.
 * @param agentSource - Full source used for duplicate-`FROM` diagnostics.
 * @param isFromResolved - Whether a previous `FROM ...` line was already handled.
 * @param parentContext - Effective parent state computed earlier in the resolution.
 * @returns Output lines and remaining `FROM` issues.
 */
function resolveFromCommitmentLine(
    line: string,
    agentSource: string_book,
    isFromResolved: boolean,
    parentContext: ResolvedParentAgentContext,
): ResolvedFromCommitmentLine {
    if (isFromResolved) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Multiple \`FROM\` commitments found in agent source:

                    \`\`\`book
                    ${block(agentSource)}
                    \`\`\`
                `,
            ),
        );
    }

    if (parentContext.parentAgentUrl === null) {
        const agentSourceChunks = [line];

        if (parentContext.fromResolutionIssues.length > 0) {
            appendResolutionIssueNotes(agentSourceChunks, parentContext.fromResolutionIssues);
        }

        return {
            agentSourceChunks,
            fromResolutionIssues: [],
        };
    }

    if (parentContext.parentAgentSourceCorpus) {
        return {
            agentSourceChunks: [
                createEmbeddedAgentSourceNote(
                    `NOTE Inherited FROM ${parentContext.parentAgentUrl}`,
                    parentContext.parentAgentSourceCorpus,
                ),
                '', // <- Note: Add an extra newline for separation
            ],
            fromResolutionIssues: parentContext.fromResolutionIssues,
        };
    }

    return {
        agentSourceChunks: [
            `NOTE Parent agent "${parentContext.parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
            '',
        ],
        fromResolutionIssues: parentContext.fromResolutionIssues,
    };
}

/**
 * Rewrites the source body line by line while delegating each branching step to a focused helper.
 *
 * @param agentSource - Raw child agent source.
 * @param context - Shared import context for the current resolution pass.
 * @param parentContext - Effective parent state computed earlier in the resolution.
 * @returns Rewritten chunks plus final `FROM` bookkeeping.
 */
async function resolveAgentSourceBuild(
    agentSource: string_book,
    context: AgentImportContext,
    parentContext: ResolvedParentAgentContext,
): Promise<ResolvedAgentSourceBuild> {
    const agentSourceChunks = spaceTrim(agentSource).split(/\r?\n/);
    const resolvedAgentSourceChunks: Array<string> = [];
    let isFromResolved = false;
    let fromResolutionIssues = parentContext.fromResolutionIssues;
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    for (const line of agentSourceChunks) {
        if (line.trim().startsWith('IMPORT ')) {
            resolvedAgentSourceChunks.push(...(await resolveImportCommitmentLine(line, context)));
            continue;
        }

        if (line.trim().startsWith('FROM ')) {
            const resolvedFromCommitment = resolveFromCommitmentLine(
                line,
                agentSource,
                isFromResolved,
                {
                    ...parentContext,
                    fromResolutionIssues,
                },
            );

            resolvedAgentSourceChunks.push(...resolvedFromCommitment.agentSourceChunks);
            fromResolutionIssues = resolvedFromCommitment.fromResolutionIssues;
            isFromResolved = true;
            continue;
        }

        resolvedAgentSourceChunks.push(line);
    }
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    return {
        agentSourceChunks: resolvedAgentSourceChunks,
        isFromResolved,
        fromResolutionIssues,
    };
}

/**
 * Materializes the implicit Adam inheritance block when no explicit `FROM ...` was present.
 *
 * @param build - Current rewritten source build.
 * @param parentContext - Effective parent state computed earlier in the resolution.
 * @param adamAgentUrl - Default Adam ancestor URL.
 * @returns Updated source build with implicit Adam inheritance applied when needed.
 */
function applyImplicitAdamInheritance(
    build: ResolvedAgentSourceBuild,
    parentContext: ResolvedParentAgentContext,
    adamAgentUrl: string_agent_url,
): ResolvedAgentSourceBuild {
    if (build.isFromResolved || parentContext.parentAgentUrl !== adamAgentUrl) {
        return build;
    }

    const titleLine = build.agentSourceChunks[0] || '';
    const restLines = build.agentSourceChunks.slice(1);
    const agentSourceChunks = [titleLine, ''];

    if (parentContext.parentAgentSourceCorpus) {
        agentSourceChunks.push(
            createEmbeddedAgentSourceNote(
                `NOTE Inherited Adam FROM ${parentContext.parentAgentUrl}`,
                parentContext.parentAgentSourceCorpus,
            ),
            ...restLines,
        );
    } else {
        agentSourceChunks.push(
            `NOTE Default parent agent "${parentContext.parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
            '',
            ...restLines,
        );
    }

    return {
        ...build,
        agentSourceChunks,
    };
}

/**
 * Validates and pads the resolved source, then inserts any deferred unresolved-`FROM` notes.
 *
 * @param build - Final rewritten source build.
 * @returns Valid resolved book.
 */
function finalizeResolvedAgentSource(build: ResolvedAgentSourceBuild): string_book {
    const resolvedAgentSource = padBook(validateBook(build.agentSourceChunks.join('\n')));

    if (build.fromResolutionIssues.length === 0) {
        return resolvedAgentSource;
    }

    const unresolvedFromNotes = build.fromResolutionIssues.map(formatResolutionIssueAsNote);
    return insertNotesAfterTitle(resolvedAgentSource, unresolvedFromNotes);
}

/**
 * Throws when a `FROM`/`IMPORT` edge would create an inheritance cycle.
 *
 * @param referenceUrl - Next referenced agent URL.
 * @param commitmentType - Commitment that introduced the reference.
 * @param options - Current resolution options.
 */
function assertNoResolutionCycle(
    referenceUrl: string_agent_url,
    commitmentType: 'FROM' | 'IMPORT',
    options?: ResolveInheritedAgentSourceOptions,
): void {
    const normalizedReferenceUrl = normalizeAgentUrl(referenceUrl);
    const lineage = createResolutionLineage(options);
    const cycleStartIndex = lineage.findIndex((visitedUrl) => visitedUrl === normalizedReferenceUrl);

    if (cycleStartIndex === -1) {
        return;
    }

    const cycleChain = [...lineage.slice(cycleStartIndex), normalizedReferenceUrl]
        .map((visitedUrl) => `- \`${visitedUrl}\``)
        .join('\n');

    throw new ParseError(
        spaceTrim(
            (block) => `
                Cyclic \`${commitmentType}\` reference detected while resolving agent source.

                Resolution chain:
                ${block(cycleChain)}
            `,
        ),
    );
}

/**
 * Resolves agent source with inheritance (FROM commitment)
 *
 * It recursively fetches the parent agent source and merges it with the current source.
 *
 * @param agentSource The initial agent source
 * @returns The resolved agent source with inheritance applied
 */
export async function resolveInheritedAgentSource(
    agentSource: string_book,
    options?: ResolveInheritedAgentSourceOptions,
): Promise<string_book> {
    const context = createAgentImportContext(options);
    const parentContext = await resolveParentAgentContext(agentSource, context);
    const resolvedBuild = await resolveAgentSourceBuild(agentSource, context, parentContext);
    const finalizedBuild = applyImplicitAdamInheritance(resolvedBuild, parentContext, context.adamAgentUrl);

    return finalizeResolvedAgentSource(finalizedBuild);
}

// TODO: [🈲] Create a function that can manipulate books by modifying commitments, splitting the book up into commitments or syntactic tokens, and editing or deleting these via object methods.
// TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
