import { lstat, readFile } from 'fs/promises';
import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from '../../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { getCommitmentDefinition } from '../../../commitments/_common/getCommitmentDefinition';
import { ParseError } from '../../../errors/ParseError';

/**
 * Reads a project-owned Book before initialization, refusing unsafe edits while preserving its original bytes.
 * Unknown commitments remain supported, as in the normal Book parser.
 *
 * @private internal utility of `coder init`
 */
export async function readCoderAgentBook(filePath: string): Promise<string_book> {
    const entry = await lstat(filePath);
    if (!entry.isFile()) {
        throw new ParseError(
            spaceTrim(
                `Expected a regular Book file at \`${filePath}\`; directories and symbolic links are left untouched.`,
            ),
        );
    }

    const bytes = await readFile(filePath);
    const source = bytes.toString('utf-8') as string_book;
    if (!Buffer.from(source, 'utf-8').equals(bytes) || source.includes('\0')) {
        throw new ParseError(spaceTrim(`Book \`${filePath}\` is not valid UTF-8 text.`));
    }

    const parsed = parseAgentSourceWithCommitments(source);
    if (!parsed.agentName) {
        throw new ParseError(spaceTrim(`Book \`${filePath}\` is empty or has no agent name.`));
    }

    let isInsideCodeBlock = false;
    for (const line of source.split(/\r?\n/).slice(parsed.agentNameLineNumber)) {
        if (line.trim().startsWith('```')) {
            isInsideCodeBlock = !isInsideCodeBlock;
        } else if (!isInsideCodeBlock && /^(?:<{7}|={7}|>{7})(?:\s|$)/.test(line)) {
            throw new ParseError(spaceTrim(`Book \`${filePath}\` contains unresolved merge markers.`));
        }
    }
    if (isInsideCodeBlock) {
        throw new ParseError(spaceTrim(`Book \`${filePath}\` contains an unclosed code block.`));
    }

    for (const commitment of parsed.commitments) {
        // FROM may disable inheritance, and OPEN is valid without its optional teacher instructions.
        if (
            !['FROM', 'OPEN'].includes(commitment.type) &&
            !commitment.content &&
            !getCommitmentDefinition(commitment.type)?.createRegex().test(commitment.type)
        ) {
            throw new ParseError(
                spaceTrim(
                    `Book \`${filePath}\` has an empty \`${commitment.type}\` commitment on line ${commitment.lineNumber}.`,
                ),
            );
        }
    }
    return source;
}
