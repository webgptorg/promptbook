'use client';

import { useThemeMode } from './ThemeModeProvider';

/**
 * Maps the Agents Server theme state to Promptbook component and Monaco theme identifiers.
 *
 * @private shared helper for themed client components
 */
export function usePromptbookTheme() {
    const { resolvedThemeMode } = useThemeMode();

    return {
        promptbookTheme: resolvedThemeMode,
        monacoTheme: resolvedThemeMode === 'DARK' ? 'vs-dark' : 'vs-light',
    } as const;
}
