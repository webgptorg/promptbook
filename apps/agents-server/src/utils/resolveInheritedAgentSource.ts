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
 * @param parsedAgentSource - Parsed source containing commitments.
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
 * @@@
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
    const { adamAgentUrl = 'https://core.ptbk.io/agents/adam', recursionLevel = 0 } = options || {};
    const agentReferenceResolver = options?.agentReferenceResolver;
    const federatedAgentImportConfiguration =
        options?.federatedAgentImportConfiguration || DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION;
    const explicitFromContent = getLastSingleLineCommitmentContent(agentSource, 'FROM');
    const hasExplicitFromCommitment = explicitFromContent !== undefined;
    const resolvedParentAgentUrl = await resolveParentAgentUrlFromCommitments(agentSource, agentReferenceResolver);
    let fromResolutionIssues = consumeAgentReferenceResolutionIssues(agentReferenceResolver).filter(
        (issue) => issue.commitmentType === 'FROM',
    );

    let parentAgentUrl: string_agent_url | null;

    // Note: [🆓] There are several cases what the agent ancestor could be:
    // 1️⃣ Parent URL is explicitly defined and valid
    if (isValidAgentUrl(resolvedParentAgentUrl)) {
        parentAgentUrl = resolvedParentAgentUrl as string_agent_url;
    }
    // 2️⃣ Parent URL is explicitly defined as null (forcefully no parent)
    else if (resolvedParentAgentUrl === null && hasExplicitFromCommitment) {
        parentAgentUrl = null;
    }
    // 3️⃣ Parent URL is not defined, use the default ancestor - Adam
    else if (resolvedParentAgentUrl === undefined || resolvedParentAgentUrl === null) {
        parentAgentUrl =
            options?.currentAgentUrl && normalizeAgentUrl(options.currentAgentUrl) === normalizeAgentUrl(adamAgentUrl)
                ? null
                : adamAgentUrl;
    }
    // 4️⃣ Parent URL is defined but invalid
    else {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Invalid parent agent URL in FROM "${resolvedParentAgentUrl}" commitment:

                    \`\`\`book
                    ${block(agentSource)}
                    \`\`\`
            
                `,
            ),
        );
    }

    let parentAgentSourceCorpus: string | null = null;

    if (parentAgentUrl) {
        assertNoResolutionCycle(parentAgentUrl, 'FROM', options);
        const parentAgentSource = await importAgentWithFallback(
            parentAgentUrl,
            {
                recursionLevel,
                inheritancePath: createResolutionLineage(options),
            },
            federatedAgentImportConfiguration,
        );
        parentAgentSourceCorpus = getAgentSourceCorpus(parentAgentSource as string_book);
    }

    let isFromResolved = false;
    const newAgentSourceChunks: Array<string> = [];
    const agentSourceChunks = spaceTrim(agentSource).split(/\r?\n/);
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    for (let i = 0; i < agentSourceChunks.length; i++) {
        const line = agentSourceChunks[i]!;

        if (line.trim().startsWith('IMPORT ')) {
            const rawImportedUrlOrPath = line.trim().substring('IMPORT '.length).trim();
            let importedUrlOrPath = rawImportedUrlOrPath;
            let importResolutionIssues: Array<AgentReferenceResolutionIssue> = [];

            if (agentReferenceResolver && rawImportedUrlOrPath) {
                try {
                    importedUrlOrPath = await agentReferenceResolver.resolveCommitmentContent(
                        'IMPORT',
                        rawImportedUrlOrPath,
                    );
                } catch (error) {
                    console.warn('[AgentReferenceResolver] Failed to resolve IMPORT commitment references:', error);
                } finally {
                    importResolutionIssues = consumeAgentReferenceResolutionIssues(agentReferenceResolver).filter(
                        (issue) => issue.commitmentType === 'IMPORT' || issue.commitmentType === 'IMPORTS',
                    );
                }
            }

            appendResolutionIssueNotes(newAgentSourceChunks, importResolutionIssues);

            if (!importedUrlOrPath) {
                continue;
            }

            if (isValidAgentUrl(importedUrlOrPath)) {
                const importedAgentUrl = importedUrlOrPath as string_agent_url;
                assertNoResolutionCycle(importedAgentUrl, 'IMPORT', options);
                const importedAgentSource = await importAgentWithFallback(
                    importedAgentUrl,
                    {
                        recursionLevel,
                        inheritancePath: createResolutionLineage(options),
                    },
                    federatedAgentImportConfiguration,
                );
                const importedAgentSourceCorpus = getAgentSourceCorpus(importedAgentSource);

                newAgentSourceChunks.push(
                    spaceTrim(
                        (block) => `

                            NOTE Imported from ${importedAgentUrl}
                            ${block(importedAgentSourceCorpus)}

                            NOTE ===========
                    `,
                    ),
                    '', // <- Note: Add an extra newline for separation
                );
                continue;
            }

            // Note: For non-agent imports, we keep the line as is.
            //       The createAgentModelRequirements function will handle fetching and embedding generic files.
            newAgentSourceChunks.push(line);
            continue;
        }

        if (line.trim().startsWith('FROM ')) {
            if (isFromResolved === true) {
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

            if (parentAgentUrl === null) {
                newAgentSourceChunks.push(line);

                if (fromResolutionIssues.length > 0) {
                    appendResolutionIssueNotes(newAgentSourceChunks, fromResolutionIssues);
                    fromResolutionIssues = [];
                }
            } else if (parentAgentSourceCorpus) {
                const parentSourceCorpus = parentAgentSourceCorpus;
                newAgentSourceChunks.push(
                    spaceTrim(
                        (block) => `

                            NOTE Inherited FROM ${parentAgentUrl}
                            ${block(parentSourceCorpus)}

                            NOTE ===========
                    `,
                    ),
                    '', // <- Note: Add an extra newline for separation
                );
            } else {
                newAgentSourceChunks.push(
                    `NOTE Parent agent "${parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
                );
                newAgentSourceChunks.push('');
            }

            isFromResolved = true;
            continue;
        }

        newAgentSourceChunks.push(line);
    }
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    // If no FROM was found and the parent is Adam, insert Adam's corpus after the title
    if (!isFromResolved && parentAgentUrl === adamAgentUrl) {
        // Insert after the first line (title)
        const titleLine = newAgentSourceChunks[0] || '';
        const restLines = newAgentSourceChunks.slice(1);
        newAgentSourceChunks.length = 0;
        if (parentAgentSourceCorpus) {
            const parentSourceCorpus = parentAgentSourceCorpus;
            newAgentSourceChunks.push(
                titleLine,
                '',
                spaceTrim(
                    (block) => `
                        NOTE Inherited Adam FROM ${parentAgentUrl}
                        ${block(parentSourceCorpus)}

                        NOTE ===========
                    `,
                ),
                ...restLines,
            );
        } else {
            newAgentSourceChunks.push(
                titleLine,
                '',
                `NOTE Default parent agent "${parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
                '',
                ...restLines,
            );
        }
    }

    if (fromResolutionIssues.length > 0) {
        const unresolvedFromNotes = fromResolutionIssues.map(formatResolutionIssueAsNote);
        return insertNotesAfterTitle(padBook(validateBook(newAgentSourceChunks.join('\n'))), unresolvedFromNotes);
    }

    const newAgentSource = padBook(validateBook(newAgentSourceChunks.join('\n')));

    return newAgentSource;
}

// TODO: [🈲] Create a function that can manipulate books by modifying commitments, splitting the book up into commitments or syntactic tokens, and editing or deleting these via object methods.
// TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
