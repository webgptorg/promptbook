import { spaceTrim } from 'spacetrim';
import type { AgentReferenceResolver } from '../../../book-2.0/agent-source/AgentReferenceResolver';
import { extractAgentReferenceTokens } from '../../../book-2.0/agent-source/extractAgentReferenceTokens';
import {
    createPseudoAgentUrl,
    isPseudoAgentAllowedInCommitment,
    resolvePseudoAgentKindFromReference,
    VOID_PSEUDO_AGENT_REFERENCE,
} from '../../../book-2.0/agent-source/pseudoAgentReferences';
import type { BookCommitment } from '../../../commitments/_base/BookCommitment';
import { ParseError } from '../../../errors/ParseError';
import type { LocalAgentBook, LocalAgentBookCollection } from './LocalAgentBookCollection';

/**
 * Creates a resolver scoped to the book which declares each reference.
 *
 * @private internal utility of CLI agent resolution
 */
export function createLocalAgentReferenceResolver(
    collection: LocalAgentBookCollection,
    declaringBook: LocalAgentBook,
): AgentReferenceResolver {
    /** Resolves pseudo-agents using the same aliases and restrictions as the Agent Server. */
    async function resolveReference(commitmentType: BookCommitment, reference: string): Promise<string> {
        const pseudoAgentKind = resolvePseudoAgentKindFromReference(reference);
        if (!pseudoAgentKind) {
            return collection.resolveReference(reference, declaringBook);
        }
        if (!isPseudoAgentAllowedInCommitment(pseudoAgentKind, commitmentType)) {
            throw new ParseError(spaceTrim(`Pseudo-agent \`${reference}\` cannot be used in \`${commitmentType}\`.`));
        }
        if (pseudoAgentKind === 'VOID' && commitmentType === 'FROM') {
            return VOID_PSEUDO_AGENT_REFERENCE;
        }
        if (pseudoAgentKind === 'VOID' && (commitmentType === 'IMPORT' || commitmentType === 'IMPORTS')) {
            return '';
        }
        return createPseudoAgentUrl(pseudoAgentKind);
    }

    return {
        resolveCommitmentContent: async (commitmentType, content) => {
            const tokens = extractAgentReferenceTokens(content);
            if (tokens.length === 0) {
                if (commitmentType !== 'TEAM' && content.trim()) {
                    return resolveReference(commitmentType, content.trim());
                }
                return content;
            }

            const parts: string[] = [];
            let previousEnd = 0;
            for (const token of tokens) {
                parts.push(content.slice(previousEnd, token.index));
                parts.push(await resolveReference(commitmentType, token.reference));
                previousEnd = token.index + token.length;
            }
            parts.push(content.slice(previousEnd));
            return parts.join('');
        },
    };
}
