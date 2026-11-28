import { randomUUID } from 'crypto';
import { readFile, rename, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { createTeamToolName } from '../../../book-2.0/agent-source/createTeamToolName';
import { filterCommitmentsForAgentModelRequirements } from '../../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments/filterCommitmentsForAgentModelRequirements';
import { parseAgentSourceWithCommitments } from '../../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { parseTeamCommitmentContent } from '../../../book-2.0/agent-source/parseTeamCommitment';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { ParseError } from '../../../errors/ParseError';
import { createLocalAgentReferenceResolver } from '../common/createLocalAgentReferenceResolver';
import { LocalAgentBookCollection } from '../common/LocalAgentBookCollection';
import { resolveBundledAgentBookPath } from '../common/resolveBundledAgentBookPath';
import { readCoderAgentBook } from './readCoderAgentBook';

/**
 * Adds only missing bundled TEAM commitments using canonical local Book identities.
 * Role instructions come from the bundled Book, not from a harness or a second template here.
 *
 * @private internal utility of `coder init`
 */
export async function augmentCoderAgentTeam(
    projectPath: string,
    role: 'developer' | 'planner',
): Promise<'augmented' | 'unchanged'> {
    const filePath = join(projectPath, 'agents', `${role}.book`);
    const source = await readCoderAgentBook(filePath);
    const collection = new LocalAgentBookCollection(join(projectPath, 'agents'), projectPath, false);
    await collection.initialize();
    const book = await collection.readBook(filePath);
    const resolver = createLocalAgentReferenceResolver(collection, book);

    /** Resolves active TEAM commitments without fetching remote profiles or executing any tools. */
    async function resolveTeamUrls(agentSource: string_book): Promise<Set<string>> {
        const urls = new Set<string>();
        const commitments = filterCommitmentsForAgentModelRequirements(
            parseAgentSourceWithCommitments(agentSource).commitments,
        );
        for (const commitment of commitments.filter(({ type }) => type === 'TEAM')) {
            const content = await resolver.resolveCommitmentContent('TEAM', commitment.content);
            const teammates = parseTeamCommitmentContent(content);
            if (teammates.length === 0) {
                throw new ParseError(
                    spaceTrim(
                        `Cannot resolve \`TEAM ${commitment.content}\` on line ${commitment.lineNumber}. Use a supported agent reference such as \`{./lawyer.book}\`.`,
                    ),
                );
            }
            teammates.forEach(({ url }) => urls.add(url));
        }
        return urls;
    }

    const existingUrls = await resolveTeamUrls(source);
    const bundledSource = (await readFile(
        await resolveBundledAgentBookPath(`agents/default/${role}.book`),
        'utf-8',
    )) as string_book;
    const defaultTeams = parseAgentSourceWithCommitments(bundledSource).commitments.filter(
        ({ type }) => type === 'TEAM',
    );
    const additions: string[] = [];
    const requiredUrls = new Set<string>();
    for (const commitment of defaultTeams) {
        const content = await resolver.resolveCommitmentContent('TEAM', commitment.content);
        const teammates = parseTeamCommitmentContent(content);
        // Each bundled default declares one helper. Refuse a mixed declaration rather than duplicating a teammate.
        if (teammates.length !== 1) {
            throw new ParseError(spaceTrim('A bundled default TEAM commitment must reference exactly one helper.'));
        }
        for (const { url } of teammates) requiredUrls.add(url);
        if (teammates.every(({ url }) => existingUrls.has(url))) continue;
        additions.push(`TEAM ${commitment.content}`);
    }
    await assertNoConflictingTeamTools(collection, book.url, existingUrls, requiredUrls);
    if (additions.length === 0) return 'unchanged';

    const augmentedSource = insertTeamCommitments(source, additions);
    const augmentedUrls = await resolveTeamUrls(augmentedSource);
    if ([...requiredUrls].some((url) => !augmentedUrls.has(url))) {
        throw new ParseError(
            spaceTrim(
                'Existing structural commitments remove a default TEAM reference. Resolve that conflict before initializing the team.',
            ),
        );
    }
    await replaceUnchangedBook(filePath, source, augmentedSource);
    return 'augmented';
}

/** Refuses local names which would cause an added helper to share another Book's generated TEAM tool. */
async function assertNoConflictingTeamTools(
    collection: LocalAgentBookCollection,
    primaryBookUrl: string,
    existingUrls: ReadonlySet<string>,
    requiredUrls: ReadonlySet<string>,
): Promise<void> {
    const localOrigin = new URL(primaryBookUrl).origin;
    const booksByToolName = new Map<string, { url: string; filePath?: string }>();
    // Check required helpers first so a conflict between those two is reported as well.
    for (const url of new Set([...requiredUrls, ...existingUrls])) {
        if (new URL(url).origin !== localOrigin) continue;
        // Local references were registered by the resolver; this does not fetch remote teammate profiles.
        const book = await collection.getBook(url);
        const toolName = createTeamToolName(url, book.profile.agentName);
        const previousBook = booksByToolName.get(toolName);
        if (previousBook && (requiredUrls.has(url) || requiredUrls.has(previousBook.url))) {
            throw new ParseError(
                spaceTrim(
                    `TEAM tool \`${toolName}\` conflicts between \`${previousBook.filePath}\` and \`${book.filePath}\`. Give these Books distinct names or META FULLNAME values before adding the default helper reference.`,
                ),
            );
        }
        booksByToolName.set(toolName, book);
    }
}

/** Inserts at a parser-provided block boundary, preserving CLOSED, code examples, prose, and line endings. */
function insertTeamCommitments(source: string_book, additions: ReadonlyArray<string>): string_book {
    const parsed = parseAgentSourceWithCommitments(source);
    const boundaries = [...parsed.commitments, ...parsed.unknownCommitments].map(({ lineNumber }) => lineNumber);
    const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
    const insertedText = additions.join(lineEnding) + lineEnding;
    if (boundaries.length === 0) {
        return (source + (source.endsWith('\n') ? '' : lineEnding) + lineEnding + insertedText) as string_book;
    }
    // The last block may be CLOSED/OPEN, a multiline commitment, or an unknown extension. Keep it intact.
    const insertionLine = Math.max(...boundaries) - 1;
    const lines = source.match(/[^\n]*\n|[^\n]+$/g) || [];
    const offset = lines.slice(0, insertionLine).join('').length;
    return (source.slice(0, offset) + insertedText + lineEnding + source.slice(offset)) as string_book;
}

/** Prepares the complete edit before replacing the file and refuses concurrent project edits. */
async function replaceUnchangedBook(filePath: string, originalSource: string_book, source: string_book): Promise<void> {
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporaryPath, source, { flag: 'wx', mode: (await stat(filePath)).mode });
        if ((await readCoderAgentBook(filePath)) !== originalSource) {
            throw new ParseError(
                spaceTrim(
                    `Book \`${filePath}\` changed during initialization. Its new content was preserved; run init again.`,
                ),
            );
        }
        await rename(temporaryPath, filePath);
    } finally {
        await unlink(temporaryPath).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'ENOENT') throw error;
        });
    }
}
