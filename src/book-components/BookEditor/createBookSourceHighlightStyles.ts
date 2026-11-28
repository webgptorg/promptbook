import { BOOK_EDITOR_SYNTAX_TOKEN_STYLES, type BookEditorSyntaxTokenStyle } from './BookEditorSyntaxTokenStyles';
import { BOOK_SYNTAX_TOKEN_CLASS_NAME_PREFIX } from './highlightBookSourceToHtml';

/**
 * Font styles that `BookEditorSyntaxTokenStyle` can request.
 *
 * @private internal constant of `createBookSourceHighlightStyles`
 */
const BOOK_SYNTAX_FONT_STYLE_DECLARATIONS: Readonly<Record<string, string>> = {
    bold: 'font-weight: bold;',
    italic: 'font-style: italic;',
    underline: 'text-decoration: underline;',
};

/**
 * Creates the CSS matching the markup of `highlightBookSourceToHtml`.
 *
 * Both the stylesheet and the markup are derived from the shared
 * `BOOK_EDITOR_SYNTAX_TOKEN_STYLES`, therefore a statically rendered book keeps
 * the exact colors of `<BookEditor/>`.
 *
 * @returns CSS rules for every Book syntax token.
 *
 * @private internal utility of `BookEditor`
 */
export function createBookSourceHighlightStyles(): string {
    return BOOK_EDITOR_SYNTAX_TOKEN_STYLES.map(createBookSourceHighlightRule).join('\n');
}

/**
 * Creates one CSS rule for a single Book syntax token.
 *
 * @param tokenStyle - Shared visual style of the token.
 * @returns CSS rule for the token class name.
 *
 * @private internal utility of `createBookSourceHighlightStyles`
 */
function createBookSourceHighlightRule(tokenStyle: BookEditorSyntaxTokenStyle): string {
    const declarations = [
        `color: ${tokenStyle.foreground};`,
        ...(tokenStyle.background ? [`background: ${tokenStyle.background};`] : []),
        ...(tokenStyle.fontStyle || '')
            .split(/\s+/)
            .filter((fontStyle) => fontStyle.length > 0)
            .map((fontStyle) => BOOK_SYNTAX_FONT_STYLE_DECLARATIONS[fontStyle] || ''),
    ].filter((declaration) => declaration.length > 0);

    return `.${BOOK_SYNTAX_TOKEN_CLASS_NAME_PREFIX}${tokenStyle.token} { ${declarations.join(' ')} }`;
}
