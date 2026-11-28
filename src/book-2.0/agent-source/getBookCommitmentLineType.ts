/**
 * Pattern shared by Book parsing and editor highlighting for a commitment-like line.
 *
 * A Book commitment keyword consists of one or more all-uppercase words with at least
 * two characters each. This deliberately mirrors the Book editor syntax rule so an
 * unknown keyword starts a new source block everywhere it is interpreted.
 *
 * @private internal constant of `getBookCommitmentLineType`
 */
const BOOK_COMMITMENT_LINE_TYPE_REGEX = /^\s*(?<type>[A-Z][A-Z0-9]+(?:\s+[A-Z][A-Z0-9]+)*)(?=\s|$)/;

/**
 * Creates the regex used to recognize the uppercase commitment type at the beginning of a Book line.
 *
 * A fresh regular expression keeps Monaco tokenizer state isolated from parser calls.
 *
 * @returns Regular expression matching one Book commitment-like line.
 *
 * @private internal utility of Book parsing and `<BookEditor/>`
 */
export function createBookCommitmentLineTypeRegex(): RegExp {
    return new RegExp(BOOK_COMMITMENT_LINE_TYPE_REGEX.source);
}

/**
 * Extracts the uppercase commitment type from a Book line, including types not registered by Promptbook.
 *
 * @param line - One raw Book source line.
 * @returns Matched commitment type or `null` when the line does not begin with commitment syntax.
 *
 * @private internal utility of Book parsing and `<BookEditor/>`
 */
export function getBookCommitmentLineType(line: string): string | null {
    const match = BOOK_COMMITMENT_LINE_TYPE_REGEX.exec(line);
    return match?.groups?.type || null;
}
