'use client';

import { useMemo } from 'react';
import {
    resolveAgentsServerMonacoTheme,
    resolveAgentsServerPromptbookComponentTheme,
} from '../../constants/themePreferences';
import { useThemePreferences } from './ThemePreferencesProvider';

/**
 * Resolves the shared component theme tokens derived from the current Agents Server preference.
 *
 * @private shared helper for themed Promptbook/Monaco wrappers
 */
export function useAgentsServerComponentThemes() {
    const { isDarkTheme, resolvedTheme } = useThemePreferences();

    return useMemo(
        () => ({
            isDarkTheme,
            resolvedTheme,
            promptbookTheme: resolveAgentsServerPromptbookComponentTheme(resolvedTheme),
            monacoTheme: resolveAgentsServerMonacoTheme(resolvedTheme),
        }),
        [isDarkTheme, resolvedTheme],
    );
}
