import {
    createAgentModelRequirements,
    padBook,
    UnexpectedError,
    validateBook,
} from '../../../../src/_packages/core.index'; // <- [🚾]
import { string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import { importAgent } from './importAgent';

/**
 * Resolves agent source with inheritance (FROM commitment)
 *
 * It recursively fetches the parent agent source and merges it with the current source.
 *
 * @param agentSource The initial agent source
 * @returns The resolved agent source with inheritance applied
 */
export async function resolveInheritedAgentSource(agentSource: string_book): Promise<string_book> {
    // Check if the source has FROM commitment
    // We use createAgentModelRequirements to parse commitments
    // Note: We don't provide tools/models here as we only care about parsing commitments
    const requirements = await createAgentModelRequirements(agentSource);

    if (!requirements.parentAgentUrl) {
        return agentSource;
    }

    let parentAgentSource = await importAgent(requirements.parentAgentUrl);
    // Remove trailing OPEN or CLOSED if present
    parentAgentSource = parentAgentSource.replace(/\n?(OPEN|CLOSED)\s*$/i, '') as string_book;

    const parentAgentSourceCorpus = spaceTrim(parentAgentSource.replace(/^.*$/m, ''));
    // <- TODO: [🈲] Simple and encapsulated way to get book corpus

    let isFromResolved = false;
    const newAgentSourceChunks: Array<string> = [];
    const agentSourceChunks = spaceTrim(agentSource).split('\n');
    // <- TODO: [🈲] Simple and encapsulated way to split book into commitments

    for (const line of agentSourceChunks) {
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

            newAgentSourceChunks.push(parentAgentSourceCorpus);
            isFromResolved = true;
            continue;
        }

        newAgentSourceChunks.push(line);
    }

    const newAgentSource = padBook(validateBook(newAgentSourceChunks.join('\n')));

    return newAgentSource;
}

/**
 * TODO: [🈲] Create a function that can manipulate books by modifying commitments, splitting the book up into commitments or syntactic tokens, and editing or deleting these via object methods.
 * TODO: [🐱‍🚀][⏩] This function should be in `/src` and exported from `@promptbook/core`
 */
