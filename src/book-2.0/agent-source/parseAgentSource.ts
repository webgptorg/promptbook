import spaceTrim from 'spacetrim';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import type { AgentBasicInformation, AgentCapability } from './AgentBasicInformation';
import { computeAgentHash } from './computeAgentHash';
import { createDefaultAgentName } from './createDefaultAgentName';
import { normalizeAgentName } from './normalizeAgentName';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import type { string_book } from './string_book';

/**
 * Parses basic information from agent source
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentSource(agentSource: string_book): AgentBasicInformation {
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Find PERSONA and META commitments
    let personaDescription: string | null = null;

    for (const commitment of parseResult.commitments) {
        if (commitment.type !== 'PERSONA') {
            continue;
        }

        if (personaDescription === null) {
            personaDescription = '';
        } else {
            personaDescription += `\n\n${personaDescription}`;
        }

        personaDescription += commitment.content;
    }

    let initialMessage: string | null = null;

    for (const commitment of parseResult.commitments) {
        if (commitment.type !== 'INITIAL MESSAGE') {
            continue;
        }

        // Note: Initial message override logic - later overrides earlier
        //       Or should it append? Usually initial message is just one block.
        //       Let's stick to "later overrides earlier" for simplicity, or just take the last one.
        initialMessage = commitment.content;
    }

    const meta: Record<string, string> = {};
    const links: string[] = [];
    const capabilities: AgentCapability[] = [];
    const samples: Array<{ question: string | null; answer: string }> = [];
    let pendingUserMessage: string | null = null;

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'INITIAL MESSAGE') {
            samples.push({ question: null, answer: commitment.content });
            continue;
        }

        if (commitment.type === 'USER MESSAGE') {
            pendingUserMessage = commitment.content;
            continue;
        }

        if (commitment.type === 'AGENT MESSAGE') {
            if (pendingUserMessage !== null) {
                samples.push({ question: pendingUserMessage, answer: commitment.content });
                pendingUserMessage = null;
            }
            continue;
        }

        if (commitment.type === 'USE BROWSER') {
            capabilities.push({
                type: 'browser',
                label: 'Browser',
                iconName: 'Globe',
            });
            continue;
        }

        if (commitment.type === 'USE SEARCH ENGINE') {
            capabilities.push({
                type: 'search-engine',
                label: 'Search Internet',
                iconName: 'Search',
            });
            continue;
        }

        if (commitment.type === 'USE TIME') {
            capabilities.push({
                type: 'time',
                label: 'Time',
                iconName: 'Clock',
            });
            continue;
        }

        if (commitment.type === 'FROM') {
            const content = spaceTrim(commitment.content).split('\n')[0] || '';

            if (content === 'Adam' || content === '' /* <- Note: Adam is implicit */) {
                continue;
            }

            let label = content;
            let iconName = 'SquareArrowOutUpRight'; // Inheritance remote
            if (content.startsWith('./') || content.startsWith('../') || content.startsWith('/')) {
                label = content.split('/').pop() || content;
                iconName = 'SquareArrowUpRight'; // Inheritance local
            }

            if (content === 'VOID') {
                label = 'VOID';
                iconName = 'ShieldAlert'; // [🧠] Or some other icon for VOID
            }

            capabilities.push({
                type: 'inheritance',
                label,
                iconName,
                agentUrl: content as any,
            });
            continue;
        }

        if (commitment.type === 'IMPORT') {
            const content = spaceTrim(commitment.content).split('\n')[0] || '';
            let label = content;
            let iconName = 'ExternalLink'; // Import remote

            try {
                if (content.startsWith('http://') || content.startsWith('https://')) {
                    const url = new URL(content);
                    label = url.hostname.replace(/^www\./, '') + '.../' + url.pathname.split('/').pop();
                    iconName = 'ExternalLink';
                } else if (content.startsWith('./') || content.startsWith('../') || content.startsWith('/')) {
                    label = content.split('/').pop() || content;
                    iconName = 'Link'; // Import local
                }
            } catch (e) {
                // Invalid URL or path, keep default label
            }

            capabilities.push({
                type: 'import',
                label,
                iconName,
                agentUrl: content as any,
            });
            continue;
        }

        if (commitment.type === 'KNOWLEDGE') {
            const content = spaceTrim(commitment.content).split('\n')[0] || '';
            let label = content;
            let iconName = 'Book';

            if (content.startsWith('http://') || content.startsWith('https://')) {
                try {
                    const url = new URL(content);
                    if (url.pathname.endsWith('.pdf')) {
                        label = url.pathname.split('/').pop() || 'Document.pdf';
                        iconName = 'FileText';
                    } else {
                        label = url.hostname.replace(/^www\./, '');
                    }
                } catch (e) {
                    // Invalid URL, treat as text
                }
            } else {
                // Text content - take first few words
                const words = content.split(/\s+/);
                if (words.length > 4) {
                    label = words.slice(0, 4).join(' ') + '...';
                }
            }

            capabilities.push({
                type: 'knowledge',
                label,
                iconName,
            });
            continue;
        }

        if (commitment.type === 'META LINK') {
            const linkValue = spaceTrim(commitment.content);
            links.push(linkValue);
            meta.link = linkValue;
            continue;
        }

        if (commitment.type === 'META IMAGE') {
            meta.image = spaceTrim(commitment.content);
            continue;
        }

        if (commitment.type === 'META DESCRIPTION') {
            meta.description = spaceTrim(commitment.content);
            continue;
        }

        if (commitment.type === 'META COLOR') {
            meta.color = normalizeSeparator(commitment.content);
            continue;
        }

        if (commitment.type === 'META FONT') {
            meta.font = normalizeSeparator(commitment.content);
            continue;
        }

        if (commitment.type !== 'META') {
            continue;
        }

        // Parse META commitments - format is "META TYPE content"
        const metaTypeRaw = commitment.content.split(' ')[0] || 'NONE';

        if (metaTypeRaw === 'LINK') {
            links.push(spaceTrim(commitment.content.substring(metaTypeRaw.length)));
        }

        const metaType = normalizeTo_camelCase(metaTypeRaw);
        meta[metaType] = spaceTrim(commitment.content.substring(metaTypeRaw.length));
    }

    // Generate fullname fallback if no meta fullname specified
    if (!meta.fullname) {
        meta.fullname = parseResult.agentName || createDefaultAgentName(agentSource);
    }

    // Parse parameters using unified approach - both @Parameter and {parameter} notations
    // are treated as the same syntax feature with unified representation
    const parameters = parseParameters(agentSource);
    const agentHash = computeAgentHash(agentSource);

    return {
        agentName: normalizeAgentName(parseResult.agentName || createDefaultAgentName(agentSource)),
        agentHash,
        permanentId: meta.id,
        personaDescription,
        initialMessage,
        meta,
        links,
        parameters,
        capabilities,
        samples,
    };
}

/**
 * Normalizes the separator in the content
 *
 * @param content - The content to normalize
 * @returns The content with normalized separators
 */
function normalizeSeparator(content: string): string {
    const trimmed = spaceTrim(content);
    if (trimmed.includes(',')) {
        return trimmed;
    }
    return trimmed.split(/\s+/).join(', ');
}

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */
