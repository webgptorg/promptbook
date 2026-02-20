'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Default prompt message used for unsaved-change confirmations.
 */
const DEFAULT_UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Closing will discard your progress.';

/**
 * Options that control how the unsaved changes guard behaves.
 * @private @@@
 */
export type UseUnsavedChangesGuardOptions = {
    /** Whether there are unsaved edits that need confirmation before closing. */
    hasUnsavedChanges: boolean;
    /**
     * When true, blocks in-app route transitions triggered by links/back navigation.
     *
     * @default false
     */
    preventInAppNavigation?: boolean;
    /**
     * Optional override for the message shown in confirmation dialogs and unload prompts.
     */
    message?: string;
};

/**
 * Result returned by the useUnsavedChangesGuard hook.
 * @private @@@
 */
export type UseUnsavedChangesGuardResult = {
    /**
     * Call before closing a dialog or navigating away; returns true when closing is allowed.
     */
    confirmBeforeClose: () => boolean;
};

/**
 * Returns true for plain left-clicks without modifier keys.
 *
 * @param event - Browser mouse event.
 * @returns True when the click likely represents standard navigation intent.
 */
function isPrimaryUnmodifiedClick(event: MouseEvent): boolean {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
}

/**
 * Resolves the nearest anchor element from a click event target.
 *
 * @param target - Raw DOM event target.
 * @returns Matching anchor, or null when target is not inside a link.
 */
function resolveAnchorElement(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest('a[href]');
}

/**
 * Returns true when clicking this anchor would navigate away from current URL.
 *
 * @param anchor - Anchor element considered for navigation.
 * @returns True when navigation should be blocked by unsaved-changes guard.
 */
function shouldGuardAnchorNavigation(anchor: HTMLAnchorElement): boolean {
    if (anchor.hasAttribute('download')) {
        return false;
    }

    const target = anchor.getAttribute('target');
    if (target && target !== '_self') {
        return false;
    }

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
        return false;
    }

    try {
        const destination = new URL(anchor.href, window.location.href);
        return destination.href !== window.location.href;
    } catch {
        return false;
    }
}

/**
 * React hook that blocks modal closing and browser unloads when unsaved changes exist.
 * @private @@@
 */
export function useUnsavedChangesGuard(options: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
    const { hasUnsavedChanges, preventInAppNavigation = false, message } = options;
    const promptMessage = message ?? DEFAULT_UNSAVED_CHANGES_MESSAGE;
    const isRevertingPopStateRef = useRef(false);

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = promptMessage;
            return promptMessage;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, promptMessage]);

    useEffect(() => {
        if (!hasUnsavedChanges || !preventInAppNavigation) {
            return;
        }

        const handleDocumentClick = (event: MouseEvent) => {
            if (event.defaultPrevented || !isPrimaryUnmodifiedClick(event)) {
                return;
            }

            const anchor = resolveAnchorElement(event.target);
            if (!anchor || !shouldGuardAnchorNavigation(anchor)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
        };

        const handlePopState = () => {
            if (isRevertingPopStateRef.current) {
                isRevertingPopStateRef.current = false;
                return;
            }

            isRevertingPopStateRef.current = true;
            window.history.go(1);
        };

        document.addEventListener('click', handleDocumentClick, true);
        window.addEventListener('popstate', handlePopState);

        return () => {
            document.removeEventListener('click', handleDocumentClick, true);
            window.removeEventListener('popstate', handlePopState);
            isRevertingPopStateRef.current = false;
        };
    }, [hasUnsavedChanges, preventInAppNavigation]);

    const confirmBeforeClose = useCallback(() => {
        if (!hasUnsavedChanges) {
            return true;
        }

        if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
            return true;
        }

        return window.confirm(promptMessage);
    }, [hasUnsavedChanges, promptMessage]);

    return { confirmBeforeClose };
}
