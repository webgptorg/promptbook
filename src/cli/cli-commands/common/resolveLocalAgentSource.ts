import { dirname } from 'path';
import { spaceTrim } from 'spacetrim';
import type { AgentReferenceResolver } from '../../../book-2.0/agent-source/AgentReferenceResolver';
import { getEffectiveExplicitFromCommitment } from '../../../book-2.0/agent-source/explicitFromCommitment';
import { parseAgentSourceWithCommitments } from '../../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { parseAgentSource } from '../../../book-2.0/agent-source/parseAgentSource';
import { isPseudoAgentUrl } from '../../../book-2.0/agent-source/pseudoAgentReferences';
import { resolveInheritedAgentSource } from '../../../book-2.0/agent-source/resolveInheritedAgentSource';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { DEFAULT_MAX_RECURSION } from '../../../config';
import { ParseError } from '../../../errors/ParseError';
import { createLocalAgentReferenceResolver } from './createLocalAgentReferenceResolver';
import { LocalAgentBookCollection, type LocalAgentBook } from './LocalAgentBookCollection';

/**
 * Resolved source together with the profile resolver used when compiling TEAM commitments.
 *
 * @private internal type of CLI agent resolution
 */
export type ResolvedLocalAgentSource = {
    readonly agentSource: string_book;
    readonly agentReferenceResolver: AgentReferenceResolver;
    /** Newly created books which the coder may include in its initialization commit. */
    readonly createdAgentBookPaths: ReadonlyArray<string>;
};

/**
 * Applies the shared Agent Server inheritance rules to a repository's local and remote books.
 *
 * @private internal utility of CLI agent resolution
 */
export async function resolveLocalAgentSource(
    agentBookPath: string,
    currentWorkingDirectory: string,
): Promise<ResolvedLocalAgentSource> {
    const collection = new LocalAgentBookCollection(dirname(agentBookPath), currentWorkingDirectory);
    await collection.initialize();
    const primaryBook = await collection.readBook(agentBookPath);
    const adamAgentUrl = collection.getAdamAgentUrl();

    /** Resolves each dependency with its own location and the current inheritance stack. */
    async function resolveBook(
        book: LocalAgentBook,
        inheritancePath: ReadonlyArray<string> = [],
    ): Promise<string_book> {
        if (inheritancePath.length > DEFAULT_MAX_RECURSION) {
            throw new ParseError(
                spaceTrim(
                    `Agent inheritance exceeds **${DEFAULT_MAX_RECURSION}** levels at \`${
                        book.filePath || book.url
                    }\`.`,
                ),
            );
        }
        const agentReferenceResolver = createLocalAgentReferenceResolver(collection, book);
        const source = await resolveBookCommitmentReferences(book.source, agentReferenceResolver);
        return resolveInheritedAgentSource(source, {
            adamAgentUrl,
            currentAgentUrl: book.url,
            inheritancePath,
            agentSourceImporter: async (url, context) =>
                resolveBook(await collection.getBook(url), context.importAgentOptions.inheritancePath),
        });
    }

    return {
        agentSource: await resolveBook(primaryBook),
        agentReferenceResolver: {
            ...createLocalAgentReferenceResolver(collection, primaryBook),
            resolveTeammateProfile: async (url) => {
                if (isPseudoAgentUrl(url)) {
                    return null;
                }
                const book = await collection.getBook(url);
                const parsedSource = parseAgentSource(await resolveBook(book));
                return {
                    agentName: book.profile.agentName,
                    personaDescription: parsedSource.personaDescription,
                };
            },
        },
        createdAgentBookPaths: collection.createdAgentBookPaths,
    };
}

/**
 * Resolves reference blocks before embedding dependencies so inherited TEAM paths keep their original directory.
 * Parser-provided locations keep examples, unknown commitments and ordinary prose untouched.
 */
async function resolveBookCommitmentReferences(
    source: string_book,
    resolver: AgentReferenceResolver,
): Promise<string_book> {
    const parsedSource = parseAgentSourceWithCommitments(source);
    const lines = source.split(/\r?\n/);
    const commitmentStartLines = [...parsedSource.commitments, ...(parsedSource.unknownCommitments || [])]
        .map((commitment) => commitment.lineNumber - 1)
        .sort((left, right) => left - right);
    const effectiveFrom = getEffectiveExplicitFromCommitment(source);

    for (const commitment of [...parsedSource.commitments].reverse()) {
        if (!['FROM', 'IMPORT', 'IMPORTS', 'TEAM'].includes(commitment.type)) {
            continue;
        }
        const startLine = commitment.lineNumber - 1;
        if (commitment.type === 'FROM' && effectiveFrom?.lineIndex !== startLine) {
            continue;
        }
        let endLine = commitmentStartLines.find((lineNumber) => lineNumber > startLine) ?? lines.length;
        // A horizontal rule also terminates a commitment before the next registered keyword.
        for (let lineIndex = startLine + 1; lineIndex < endLine; lineIndex++) {
            if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[lineIndex] || '')) {
                endLine = lineIndex;
                break;
            }
        }
        const content = await resolver.resolveCommitmentContent(commitment.type, commitment.content);
        const commitmentType = commitment.type === 'IMPORTS' ? 'IMPORT' : commitment.type;
        const replacement = content.trim()
            ? `${commitmentType} ${content}\n`
            : commitmentType === 'FROM'
            ? 'FROM @Null\n'
            : '';
        lines.splice(startLine, endLine - startLine, ...replacement.split('\n'));
    }
    return lines.join('\n') as string_book;
}
