'use client';

import { Code2Icon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react';
import { AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM } from '../../utils/agentProjects/agentProjectVscodeConstants';
import { useThemeMode } from '../ThemeMode/ThemeModeProvider';

/**
 * Props accepted by the browser VS Code opener.
 */
type AgentProjectVscodeOpenButtonProps = {
    /**
     * Server route that starts or reconnects to browser VS Code.
     */
    readonly href: string;
};

/**
 * Opens browser VS Code from a button or the GitHub-style `.` shortcut.
 */
export function AgentProjectVscodeOpenButton({ href }: AgentProjectVscodeOpenButtonProps) {
    const { resolvedThemeMode } = useThemeMode();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (!isAgentProjectVscodeShortcutEvent(event)) {
                return;
            }

            event.preventDefault();
            window.location.assign(buildThemedAgentProjectVscodeHref(href, resolvedThemeMode));
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [href, resolvedThemeMode]);

    const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        event.preventDefault();
        window.location.assign(buildThemedAgentProjectVscodeHref(href, resolvedThemeMode));
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLAnchorElement>): void => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        window.location.assign(buildThemedAgentProjectVscodeHref(href, resolvedThemeMode));
    };

    return (
        <Link
            href={buildThemedAgentProjectVscodeHref(href, resolvedThemeMode)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-100"
        >
            <Code2Icon className="h-3.5 w-3.5" aria-hidden />
            VS Code
        </Link>
    );
}

/**
 * Returns whether one keyboard event should open browser VS Code.
 */
function isAgentProjectVscodeShortcutEvent(event: KeyboardEvent): boolean {
    return (
        event.key === '.' &&
        !event.repeat &&
        !event.defaultPrevented &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !isEditableEventTarget(event.target)
    );
}

/**
 * Returns whether the event target is an editable browser control.
 */
function isEditableEventTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

/**
 * Adds the resolved Agents Server light/dark theme to the browser VS Code launcher href.
 */
function buildThemedAgentProjectVscodeHref(href: string, resolvedThemeMode: 'LIGHT' | 'DARK'): string {
    if (typeof window === 'undefined') {
        const separator = href.includes('?') ? '&' : '?';
        return `${href}${separator}${AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM}=${resolvedThemeMode}`;
    }

    const url = new URL(href, window.location.href);
    url.searchParams.set(AGENT_PROJECT_VSCODE_THEME_SEARCH_PARAM, resolvedThemeMode);

    return `${url.pathname}${url.search}${url.hash}`;
}
