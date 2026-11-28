/**
 * HTML entrypoint filenames recognized at the root of one agent project, ordered by priority.
 *
 * The static project server serves the first existing one of them for a directory request, so the
 * same list decides which file describes the project — its `<title>` and its favicon.
 */
export const AGENT_PROJECT_INDEX_HTML_FILE_NAMES = ['index.html', 'index.htm'] as const;

/**
 * Conventional favicon locations searched inside one agent project, ordered by priority.
 *
 * They are used only when the project `index.html` does not link its icon explicitly.
 */
export const AGENT_PROJECT_CONVENTIONAL_FAVICON_RELATIVE_PATHS = [
    'favicon.ico',
    'favicon.svg',
    'favicon.png',
    'public/favicon.ico',
    'public/favicon.svg',
    'public/favicon.png',
] as const;
