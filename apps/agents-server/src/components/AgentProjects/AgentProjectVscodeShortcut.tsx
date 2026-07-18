'use client';

import { Code2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useThemeMode } from '../ThemeMode/ThemeModeProvider';

/**
 * Props accepted by the project browser VS Code shortcut.
 */
type AgentProjectVscodeShortcutProps = {
    /**
     * Server launcher href without a theme query parameter.
     */
    readonly href: string;
};

/**
 * Opens browser VS Code from a project page via button or GitHub-like `.` shortcut.
 *
 * @param props - Shortcut props.
 * @returns Browser VS Code launcher action.
 */
export function AgentProjectVscodeShortcut({ href }: AgentProjectVscodeShortcutProps) {
    const { resolvedThemeMode } = useThemeMode();
    const themedHref = useMemo(() => buildThemedProjectVscodeHref(href, resolvedThemeMode), [href, resolvedThemeMode]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (!isProjectVscodeShortcutEvent(event)) {
                return;
            }

            event.preventDefault();
            window.location.assign(themedHref);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [themedHref]);

    return (
        <a
            href={themedHref}
            title="Open browser VS Code"
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
        >
            <Code2Icon className="h-3.5 w-3.5" aria-hidden />
            Open VS Code
        </a>
    );
}

/**
 * Adds the resolved light/dark theme to the VS Code launcher href.
 *
 * @param href - Launcher href.
 * @param resolvedThemeMode - Current concrete theme.
 * @returns Launcher href with theme query.
 */
function buildThemedProjectVscodeHref(href: string, resolvedThemeMode: string): string {
    const url = new URL(href, 'http://localhost');
    url.searchParams.set('theme', resolvedThemeMode);
    return `${url.pathname}${url.search}`;
}

/**
 * Returns whether a keyboard event should open browser VS Code.
 *
 * @param event - Keyboard event.
 * @returns `true` for plain `.` outside editable elements.
 */
function isProjectVscodeShortcutEvent(event: KeyboardEvent): boolean {
    if (event.key !== '.' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return false;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return true;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select' && !target.isContentEditable;
}
