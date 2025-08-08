import { spaceTrim } from 'spacetrim';
import type { string_agent_name } from '../../../types/typeAliases';
import type { string_url_image } from '../../../types/typeAliases';
import type { AgentSourceBasicInformation } from '../../agent-source/parseAgentSource';
import type { string_book } from '../../agent-source/string_book';
import { generateGravatarUrl } from '../../utils/profileImageUtils';
import { COMMITMENT_REGISTRY } from '../index';
import type { AgentSourceParseResult } from './AgentSourceParseResult';
import type { ParsedCommitment } from './ParsedCommitment';
import type { BookCommitment } from '../_base/BookCommitment';

/**
 * Parses agent source using the new commitment system with multiline support
 * This function replaces the hardcoded commitment parsing in the original parseAgentSource
 *
 * @private
 */
export function parseAgentSourceWithCommitments(agentSource: string_book): AgentSourceParseResult {
    if (!agentSource || !agentSource.trim()) {
        return {
            agentName: null,
            commitments: [],
            nonCommitmentLines: [],
        };
    }

    const lines = agentSource.split('\n');
    const agentName = (lines[0]?.trim() || null) as string_agent_name | null;
    const commitments: ParsedCommitment[] = [];
    const nonCommitmentLines: string[] = [];

    // Always add the first line (agent name) to non-commitment lines
    if (lines[0] !== undefined) {
        nonCommitmentLines.push(lines[0]);
    }

    // Parse commitments with multiline support
    let currentCommitment: {
        type: string;
        startLineNumber: number;
        originalStartLine: string;
        contentLines: string[];
    } | null = null;

    // Process lines starting from the second line (skip agent name)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }

        // Check if this line starts a new commitment
        let foundNewCommitment = false;
        for (const definition of COMMITMENT_REGISTRY) {
            const typeRegex = definition.createTypeRegex();
            const match = typeRegex.exec(line.trim());

            if (match && match.groups?.type) {
                // Save the previous commitment if it exists
                if (currentCommitment) {
                    const fullContent = currentCommitment.contentLines.join('\n');
                    commitments.push({
                        type: currentCommitment.type as BookCommitment,
                        content: spaceTrim(fullContent),
                        originalLine: currentCommitment.originalStartLine,
                        lineNumber: currentCommitment.startLineNumber,
                    });
                }

                // Extract the initial content from the commitment line
                const fullRegex = definition.createRegex();
                const fullMatch = fullRegex.exec(line.trim());
                const initialContent = fullMatch?.groups?.contents || '';

                // Start a new commitment
                currentCommitment = {
                    type: definition.type,
                    startLineNumber: i + 1,
                    originalStartLine: line,
                    contentLines: initialContent ? [initialContent] : [],
                };
                foundNewCommitment = true;
                break;
            }
        }

        if (!foundNewCommitment) {
            if (currentCommitment) {
                // This line belongs to the current commitment
                currentCommitment.contentLines.push(line);
            } else {
                // This line is not part of any commitment
                nonCommitmentLines.push(line);
            }
        }
    }

    // Don't forget to save the last commitment if it exists
    if (currentCommitment) {
        const fullContent = currentCommitment.contentLines.join('\n');
        commitments.push({
            type: currentCommitment.type as BookCommitment,
            content: spaceTrim(fullContent) as BookCommitment,
            originalLine: currentCommitment.originalStartLine,
            lineNumber: currentCommitment.startLineNumber,
        });
    }

    return {
        agentName,
        commitments,
        nonCommitmentLines,
    };
}

/**
 * Extracts basic information from agent source using the new commitment system
 * This maintains compatibility with the original parseAgentSource interface
 *
 * @private
 */
export function parseAgentSourceBasicInfo(agentSource: string_book): AgentSourceBasicInformation {
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Find PERSONA and META IMAGE commitments
    let personaDescription: string | null = null;
    let profileImageUrl: string_url_image | undefined;

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'PERSONA' && !personaDescription) {
            personaDescription = commitment.content;
        } else if (commitment.type === 'META IMAGE' && !profileImageUrl) {
            profileImageUrl = commitment.content as string_url_image;
        }
    }

    // Generate gravatar fallback if no profile image specified
    if (!profileImageUrl) {
        profileImageUrl = generateGravatarUrl(parseResult.agentName) as string_url_image;
    }

    return {
        agentName: parseResult.agentName,
        personaDescription,
        profileImageUrl,
    };
}

/**
 * Extracts META LINK commitments from agent source
 * Returns an array of all META LINK URLs found in the agent source
 *
 * @private
 */
export function extractMetaLinks(agentSource: string_book): string[] {
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    const metaLinks: string[] = [];

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'META LINK') {
            const link = commitment.content.trim();
            if (link) {
                metaLinks.push(link);
            }
        }
    }

    return metaLinks;
}
