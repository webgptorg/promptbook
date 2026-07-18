'use client';

import { useEffect } from 'react';

/**
 * Props accepted by the project VS Code keyboard shortcut listener.
 */
type AgentProjectVscodeKeyboardShortcutProps = {
    /**
     * Launcher href for the current project.
     */
    readonly href: string;

    /**
     * Whether the shortcut should be active for the current viewer.
     */
    readonly isEnabled: boolean;
};

/**
 * Registers the GitHub-style `.` shortcut for opening the project in browser VS Code.
 *
 * @param props - Keyboard shortcut configuration.
 * @returns Nothing visible.
 */
export function AgentProjectVscodeKeyboardShortcut({ href, isEnabled }: AgentProjectVscodeKeyboardShortcutProps): null {
    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (
                event.key !== '.' ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                isEditableKeyboardTarget(event.target)
            ) {
                return;
            }

            event.preventDefault();
            window.location.assign(href);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [href, isEnabled]);

    return null;
}

/**
 * Returns whether a keyboard event originated from an editable element.
 *
 * @param target - Raw event target.
 * @returns `true` when the target should keep the `.` keystroke.
 */
function isEditableKeyboardTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
