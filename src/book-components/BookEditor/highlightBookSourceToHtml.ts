import { escapeHtml } from '../../utils/html/escapeHtml';
import { BookEditorMonacoTokenization } from './BookEditorMonacoTokenization';
import type { BookEditorSyntaxTokenName } from './BookEditorSyntaxTokenStyles';

/**
 * Prefix of the CSS class names emitted for highlighted Book source.
 *
 * @private internal constant of `BookEditor`
 */
export const BOOK_SYNTAX_TOKEN_CLASS_NAME_PREFIX = 'book-syntax-';

/**
 * Commitment keywords rendered as low-visibility notes.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const NOTE_COMMITMENT_TYPES = ['NOTE', 'NOTES', 'COMMENT', 'NONCE'];

/**
 * Commitment keywords rendered as high-visibility annotations.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const TODO_COMMITMENT_TYPES = ['TODO'];

/**
 * Commitment keywords whose content may contain compact agent references.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const AGENT_REFERENCE_COMMITMENT_TYPES = ['FROM', 'IMPORT', 'IMPORTS', 'TEAM'];

/**
 * Matches fenced code-block delimiters, including optional leading indentation.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const CODE_BLOCK_FENCE_REGEX = /^\s*```/;

/**
 * Matches horizontal separators between embedded agents.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const HORIZONTAL_SEPARATOR_REGEX = /^\s*-{3,}\s*$/;

/**
 * Matches `@parameter` and `{parameter}` notations inside commitment content.
 *
 * @private internal constant of `highlightBookSourceToHtml`
 */
const PARAMETER_TOKEN_REGEX = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)|\{[^{}\r\n]+\}/g;

/**
 * How the currently rendered line should be colored.
 *
 * @private internal type of `highlightBookSourceToHtml`
 */
type BookSourceHighlightState = 'title' | 'body' | 'code-block' | 'note-commitment' | 'todo-commitment';

/**
 * Highlights Book source into static HTML using the `<BookEditor/>` token colors.
 *
 * `<BookEditor/>` itself is a Monaco-based browser component and cannot run
 * where a book has to be rendered as plain markup (server-side exports such as
 * the Book language manual PDF). This function reuses the very same
 * tokenization patterns and token names, so both surfaces stay in sync.
 *
 * @param bookSource - Raw Book source to highlight.
 * @returns HTML with one `<span>` per highlighted token, safe to place into `<pre>`.
 *
 * @private internal utility of `BookEditor`
 */
export function highlightBookSourceToHtml(bookSource: string): string {
    const sourceLines = bookSource.split(/\r?\n/);
    let state: BookSourceHighlightState = 'title';
    let stateBeforeCodeBlock: BookSourceHighlightState = 'body';
    let isAgentReferenceCommitment = false;

    return sourceLines
        .map((sourceLine) => {
            if (state === 'code-block') {
                const highlightedLine = renderToken('code-block', sourceLine);

                if (CODE_BLOCK_FENCE_REGEX.test(sourceLine)) {
                    state = stateBeforeCodeBlock;
                }

                return highlightedLine;
            }

            if (CODE_BLOCK_FENCE_REGEX.test(sourceLine)) {
                stateBeforeCodeBlock = state === 'title' ? 'body' : state;
                state = 'code-block';
                return renderToken('code-block', sourceLine);
            }

            if (sourceLine.trim() === '' || HORIZONTAL_SEPARATOR_REGEX.test(sourceLine)) {
                return escapeHtml(sourceLine);
            }

            if (state === 'title') {
                state = 'body';
                return renderToken('title', sourceLine);
            }

            const commitmentKeyword = BookEditorMonacoTokenization.DYNAMIC_COMMITMENT_REGEX.exec(sourceLine)?.[0];

            if (commitmentKeyword !== undefined) {
                state = resolveCommitmentState(commitmentKeyword);
                isAgentReferenceCommitment = isCommitmentOfType(commitmentKeyword, AGENT_REFERENCE_COMMITMENT_TYPES);

                if (state !== 'body') {
                    return renderToken(state, sourceLine);
                }

                return (
                    renderToken('commitment', commitmentKeyword) +
                    renderCommitmentContent(sourceLine.slice(commitmentKeyword.length), isAgentReferenceCommitment)
                );
            }

            if (state === 'note-commitment' || state === 'todo-commitment') {
                return renderToken(state, sourceLine);
            }

            return renderCommitmentContent(sourceLine, isAgentReferenceCommitment);
        })
        .join('\n');
}

/**
 * Resolves which highlighting state one commitment keyword switches to.
 *
 * @param commitmentKeyword - Keyword matched at the beginning of a line.
 * @returns Highlighting state for the commitment block.
 *
 * @private internal utility of `highlightBookSourceToHtml`
 */
function resolveCommitmentState(commitmentKeyword: string): BookSourceHighlightState {
    if (isCommitmentOfType(commitmentKeyword, TODO_COMMITMENT_TYPES)) {
        return 'todo-commitment';
    }

    if (isCommitmentOfType(commitmentKeyword, NOTE_COMMITMENT_TYPES)) {
        return 'note-commitment';
    }

    return 'body';
}

/**
 * Returns whether one matched keyword starts with any of the given commitment types.
 *
 * @param commitmentKeyword - Keyword matched at the beginning of a line.
 * @param commitmentTypes - Commitment types to test against.
 * @returns Whether the keyword belongs to one of the commitment types.
 *
 * @private internal utility of `highlightBookSourceToHtml`
 */
function isCommitmentOfType(commitmentKeyword: string, commitmentTypes: ReadonlyArray<string>): boolean {
    const normalizedKeyword = commitmentKeyword.trim().toUpperCase();

    return commitmentTypes.some(
        (commitmentType) => normalizedKeyword === commitmentType || normalizedKeyword.startsWith(`${commitmentType} `),
    );
}

/**
 * Highlights parameters and compact agent references inside commitment content.
 *
 * @param content - Text after the commitment keyword.
 * @param isAgentReferenceCommitment - Whether the surrounding commitment supports agent references.
 * @returns HTML for the commitment content.
 *
 * @private internal utility of `highlightBookSourceToHtml`
 */
function renderCommitmentContent(content: string, isAgentReferenceCommitment: boolean): string {
    const tokenRegex = isAgentReferenceCommitment
        ? new RegExp(BookEditorMonacoTokenization.AGENT_REFERENCE_TOKEN_REGEX.source, 'g')
        : new RegExp(PARAMETER_TOKEN_REGEX.source, 'g');
    const tokenName: BookEditorSyntaxTokenName = isAgentReferenceCommitment ? 'agent-reference' : 'parameter';

    let renderedContent = '';
    let plainTextStartIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(content)) !== null) {
        renderedContent += escapeHtml(content.slice(plainTextStartIndex, match.index));
        renderedContent += renderToken(tokenName, match[0]);
        plainTextStartIndex = match.index + match[0].length;
    }

    return renderedContent + escapeHtml(content.slice(plainTextStartIndex));
}

/**
 * Wraps one piece of Book source into its highlighted `<span>`.
 *
 * @param tokenName - Book syntax token of the text.
 * @param text - Raw source text of the token.
 * @returns HTML span carrying the token class name.
 *
 * @private internal utility of `highlightBookSourceToHtml`
 */
function renderToken(tokenName: BookEditorSyntaxTokenName, text: string): string {
    return `<span class="${BOOK_SYNTAX_TOKEN_CLASS_NAME_PREFIX}${tokenName}">${escapeHtml(text)}</span>`;
}
