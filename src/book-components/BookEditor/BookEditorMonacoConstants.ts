import { PROMPTBOOK_COMPONENT_THEMES, type PromptbookComponentTheme } from '../_common/PromptbookComponentTheme';

/**
 * Shared constants for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export const BookEditorMonacoConstants = {
    BOOK_LANGUAGE_ID: 'book',
    BOOK_THEME_LIGHT_ID: 'book-theme-light',
    BOOK_THEME_DARK_ID: 'book-theme-dark',
    LINE_HEIGHT: 28,
    CONTENT_PADDING_LEFT: 20,
    VERTICAL_LINE_LEFT: 0,
    UPLOAD_EDIT_DEBOUNCE_MS: 300,
    UPLOAD_PROGRESS_DEBOUNCE_MS: 150,
    DIAGNOSTIC_MARKER_OWNER: 'book-editor-diagnostics',
} as const;

/**
 * Resolves the Monaco theme id for one explicit BookEditor theme.
 *
 * @param theme - Explicit light/dark BookEditor theme.
 * @returns Monaco theme id registered by `useBookEditorMonacoLanguage`.
 *
 * @private function of BookEditorMonaco
 */
export function resolveBookEditorMonacoThemeId(theme: PromptbookComponentTheme): string {
    return theme === PROMPTBOOK_COMPONENT_THEMES.DARK
        ? BookEditorMonacoConstants.BOOK_THEME_DARK_ID
        : BookEditorMonacoConstants.BOOK_THEME_LIGHT_ID;
}
