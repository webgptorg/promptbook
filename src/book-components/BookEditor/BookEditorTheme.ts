/**
 * Visual theme accepted by `<BookEditor/>` integrations.
 *
 * @private internal type of `BookEditor`
 */
export type BookEditorTheme = 'LIGHT' | 'DARK';

/**
 * Theme used for the actual notebook editor surface.
 *
 * The host application can still pass its resolved app theme, but book sources
 * are intentionally rendered as light paper in both light and dark app modes.
 *
 * @private internal constant of `BookEditor`
 */
export const BOOK_EDITOR_RENDER_THEME = 'LIGHT' satisfies BookEditorTheme;

/**
 * Resolves an app-level theme into the visual theme used by `<BookEditor/>`.
 *
 * @param hostTheme - Resolved theme from the embedding application.
 * @returns Light theme used by the Book editor surface.
 *
 * @private internal utility of `BookEditor`
 */
export function resolveBookEditorRenderTheme(hostTheme: BookEditorTheme = BOOK_EDITOR_RENDER_THEME): BookEditorTheme {
    if (hostTheme === 'DARK') {
        return BOOK_EDITOR_RENDER_THEME;
    }

    return hostTheme;
}
