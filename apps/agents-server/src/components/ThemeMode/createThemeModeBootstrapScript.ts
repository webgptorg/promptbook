import {
    resolveThemeMode,
    THEME_MODE_STORAGE_KEY,
    type ThemeMode,
} from '../../constants/themeMode';

/**
 * Builds the inline bootstrap script that applies the saved theme before React hydrates.
 */
export function createThemeModeBootstrapScript(defaultThemeMode: string | null | undefined): string {
    const normalizedDefaultThemeMode = resolveThemeMode(defaultThemeMode);

    return `(function(){var VALID={SYSTEM:true,LIGHT:true,DARK:true};var STORAGE_KEY=${JSON.stringify(
        THEME_MODE_STORAGE_KEY,
    )};var DEFAULT_THEME_MODE=${JSON.stringify(
        normalizedDefaultThemeMode satisfies ThemeMode,
    )};var root=document.documentElement;var themeMode=DEFAULT_THEME_MODE;try{var storedThemeMode=window.localStorage.getItem(STORAGE_KEY);if(storedThemeMode&&VALID[storedThemeMode]){themeMode=storedThemeMode;}}catch(error){}var isSystemDark=false;try{isSystemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}catch(error){}var resolvedTheme=themeMode==='DARK'||(themeMode==='SYSTEM'&&isSystemDark)?'dark':'light';root.dataset.themeMode=themeMode.toLowerCase();root.dataset.themeResolved=resolvedTheme;root.classList.toggle('dark',resolvedTheme==='dark');root.style.colorScheme=resolvedTheme;})();`;
}
