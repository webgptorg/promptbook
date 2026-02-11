import {
    createAgentModelRequirements,
    padBook,
    ParseError,
    UnexpectedError,
    validateBook,
} from '../../../../src/_packages/core.index'; // <- [🚾]
import { string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import { isValidAgentUrl } from '../../../../src/_packages/utils.index'; // <- [🚾]
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import {
    type AgentReferenceResolutionIssue,
    consumeAgentReferenceResolutionIssues,
} from './agentReferenceResolver/AgentReferenceResolutionIssue';
import { importAgent, ImportAgentOptions } from './importAgent';

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
 * Creates a short human-readable error message for logging/notes.
 *
 * @param error - Unknown error value.
 * @returns String message safe for display.
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return String(error);
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
 * @@@
 */
type ResolveInheritedAgentSourceOptions = ImportAgentOptions & {
    /**
     * The URL of the Adam agent to use as the default ancestor
     *
     * @default 'https://core.ptbk.io/agents/adam'
     */
    readonly adamAgentUrl: string_agent_url;
    /**
     * Custom resolver used to expand compact agent references.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;
};

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

    // Check if the source has FROM commitment
    // We use createAgentModelRequirements to parse commitments
    // Note: We don't provide tools/models here as we only care about parsing commitments
    const requirements = await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
        agentReferenceResolver,
    });
    let fromResolutionIssues = consumeAgentReferenceResolutionIssues(agentReferenceResolver).filter(
        (issue) => issue.commitmentType === 'FROM',
    );

    let parentAgentUrl: string_agent_url | null;

    // Note: [🆓] There are several cases what the agent ancestor could be:
    // 1️⃣ Parent URL is explicitly defined and valid
    if (isValidAgentUrl(requirements.parentAgentUrl)) {
        parentAgentUrl = requirements.parentAgentUrl as string_agent_url;
    }
    // 2️⃣ Parent URL is explicitly defined as null (forcefully no parent)
    else if (requirements.parentAgentUrl === null) {
        parentAgentUrl = null;
    }
    // 3️⃣ Parent URL is not defined, use the default ancestor - Adam
    else if (requirements.parentAgentUrl === undefined) {
        parentAgentUrl = adamAgentUrl;
    }
    // 4️⃣ Parent URL is defined but invalid
    else {
        throw new ParseError(
            spaceTrim(
                (block) => `
                    Invalid parent agent URL in FROM "${requirements.parentAgentUrl}" commitment:

                    \`\`\`book
                    ${block(agentSource)}
                    \`\`\`
            
                `,
            ),
        );
    }

    let parentAgentSourceCorpus: string | null = null;
    let parentAgentImportErrorMessage: string | null = null;

    if (parentAgentUrl) {
        try {
            const parentAgentSource = await importAgent(parentAgentUrl, { recursionLevel });
            parentAgentSourceCorpus = getAgentSourceCorpus(parentAgentSource as string_book);
        } catch (error) {
            parentAgentImportErrorMessage = getErrorMessage(error);
            console.warn(`[resolveInheritedAgentSource] Failed to import parent agent "${parentAgentUrl}":`, error);
        }
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

                try {
                    const importedAgentSource = await importAgent(importedAgentUrl, { recursionLevel });
                    const resolvedImportedAgentSource = await resolveInheritedAgentSource(importedAgentSource, {
                        ...options,
                        adamAgentUrl,
                        agentReferenceResolver,
                        recursionLevel: recursionLevel + 1,
                    });
                    const importedAgentSourceCorpus = getAgentSourceCorpus(resolvedImportedAgentSource);

                    newAgentSourceChunks.push(
                        spaceTrim(
                            (block) => `

                                NOTE Imported from ${importedAgentUrl}
                                ${block(importedAgentSourceCorpus)}

                                ---
                        `,
                        ),
                        '', // <- Note: Add an extra newline for separation
                    );
                } catch (error) {
                    const errorMessage = getErrorMessage(error);
                    newAgentSourceChunks.push(
                        `NOTE Imported agent "${importedAgentUrl}" was not found or could not be loaded. Import skipped.`,
                        `NOTE Import error: ${errorMessage}`,
                        '',
                    );
                }
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

                            ---
                    `,
                    ),
                    '', // <- Note: Add an extra newline for separation
                );
            } else {
                newAgentSourceChunks.push(
                    `NOTE Parent agent "${parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
                );

                if (parentAgentImportErrorMessage) {
                    newAgentSourceChunks.push(`NOTE Inheritance error: ${parentAgentImportErrorMessage}`);
                }

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

                        ---
                    `,
                ),
                ...restLines,
            );
        } else {
            newAgentSourceChunks.push(
                titleLine,
                '',
                `NOTE Default parent agent "${parentAgentUrl}" was not found or could not be loaded. Inheritance skipped.`,
                ...(parentAgentImportErrorMessage ? [`NOTE Inheritance error: ${parentAgentImportErrorMessage}`] : []),
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

/**
 * TODO: [🈲] Create a function that can manipulate books by modifying commitments, splitting the book up into commitments or syntactic tokens, and editing or deleting these via object methods.
 * TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
 */
