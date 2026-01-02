import {
    createAgentModelRequirements,
    padBook,
    ParseError,
    UnexpectedError,
    validateBook,
} from '../../../../src/_packages/core.index'; // <- [🚾]
import { string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import { isValidAgentUrl } from '../../../../src/_packages/utils.index'; // <- [🚾]
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
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
 * @@@
 */
type ResolveInheritedAgentSourceOptions = ImportAgentOptions & {
    /**
     * The URL of the Adam agent to use as the default ancestor
     *
     * @default 'https://core.ptbk.io/agents/adam'
     */
    readonly adamAgentUrl: string_agent_url;
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

    // Check if the source has FROM commitment
    // We use createAgentModelRequirements to parse commitments
    // Note: We don't provide tools/models here as we only care about parsing commitments
    const requirements = await createAgentModelRequirements(agentSource);

    let parentAgentUrl: string_agent_url;

    // Note: [🆓] There are several cases what the agent ancestor could be:
    // 1️⃣ Parent URL is explicitly defined and valid
    if (isValidAgentUrl(requirements.parentAgentUrl)) {
        parentAgentUrl = requirements.parentAgentUrl as string_agent_url;
    }
    // 2️⃣ Parent URL is explicitly defined as null (forcefully no parent)
    else if (requirements.parentAgentUrl === null) {
        return agentSource;
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

    const parentAgentSource = await importAgent(parentAgentUrl, { recursionLevel });
    const parentAgentSourceCorpus = getAgentSourceCorpus(parentAgentSource as string_book);

    let isFromResolved = false;
    const newAgentSourceChunks: Array<string> = [];
    const agentSourceChunks = spaceTrim(agentSource).split('\n');
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    for (let i = 0; i < agentSourceChunks.length; i++) {
        const line = agentSourceChunks[i]!;

        if (line.trim().startsWith('IMPORT ')) {
            const importedAgentUrl = line.trim().substring('IMPORT '.length).trim() as string_agent_url;

            if (!isValidAgentUrl(importedAgentUrl)) {
                throw new ParseError(
                    spaceTrim(
                        (block) => `
                            Invalid imported agent URL in IMPORT "${importedAgentUrl}" commitment:
        
                            \`\`\`book
                            ${block(agentSource)}
                            \`\`\`
                    
                        `,
                    ),
                );
            }

            const importedAgentSource = await importAgent(importedAgentUrl, { recursionLevel });
            const resolvedImportedAgentSource = await resolveInheritedAgentSource(importedAgentSource, {
                ...options,
                adamAgentUrl,
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

            newAgentSourceChunks.push(
                spaceTrim(
                    (block) => `

                        NOTE Inherited FROM ${parentAgentUrl}
                        ${block(parentAgentSourceCorpus)}

                        ---
                `,
                ),
                '', // <- Note: Add an extra newline for separation
            );
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
        newAgentSourceChunks.push(
            titleLine,
            '',
            spaceTrim(
                (block) => `
                    NOTE Inherited Adam FROM ${parentAgentUrl}
                    ${block(parentAgentSourceCorpus)}

                    ---
                `,
            ),
            ...restLines,
        );
    }

    const newAgentSource = padBook(validateBook(newAgentSourceChunks.join('\n')));

    return newAgentSource;
}

/**
 * TODO: [🈲] Create a function that can manipulate books by modifying commitments, splitting the book up into commitments or syntactic tokens, and editing or deleting these via object methods.
 * TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
 */
