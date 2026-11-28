import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';

/**
 * One token emitted while highlighting Book source.
 *
 * @private internal type of `BookEditor`
 */
export type BookEditorSyntaxTokenName =
    | 'title'
    | 'commitment'
    | 'note-commitment'
    | 'todo-commitment'
    | 'parameter'
    | 'agent-reference'
    | 'code-block';

/**
 * Visual style of one Book syntax token.
 *
 * @private internal type of `BookEditor`
 */
export type BookEditorSyntaxTokenStyle = {
    /**
     * Token this style belongs to.
     */
    readonly token: BookEditorSyntaxTokenName;

    /**
     * Text color of the token.
     */
    readonly foreground: string;

    /**
     * Optional background color of the token.
     */
    readonly background?: string;

    /**
     * Optional space-separated font style, for example `bold underline`.
     */
    readonly fontStyle?: string;
};

/**
 * Single source of truth for how Book source is colored.
 *
 * The Monaco theme of `<BookEditor/>` and every static rendering of Book source
 * (for example the Book language manual PDF) are derived from these styles, so
 * a book always looks the same no matter where it is displayed.
 *
 * @private internal constant of `BookEditor`
 */
export const BOOK_EDITOR_SYNTAX_TOKEN_STYLES: ReadonlyArray<BookEditorSyntaxTokenStyle> = [
    {
        token: 'title',
        foreground: PROMPTBOOK_SYNTAX_COLORS.TITLE.toHex(),
        fontStyle: 'bold underline',
    },
    {
        token: 'commitment',
        foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
        fontStyle: 'bold',
    },
    {
        token: 'note-commitment',
        foreground: PROMPTBOOK_SYNTAX_COLORS.NOTE_COMMITMENT.toHex(),
    },
    {
        token: 'todo-commitment',
        foreground: PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_TEXT.toHex(),
        background: PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_BACKGROUND.toHex(),
        fontStyle: 'bold',
    },
    {
        token: 'parameter',
        foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(),
        fontStyle: 'italic',
    },
    {
        token: 'agent-reference',
        foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
        fontStyle: 'underline',
    },
    {
        token: 'code-block',
        foreground: PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex(),
    },
];
