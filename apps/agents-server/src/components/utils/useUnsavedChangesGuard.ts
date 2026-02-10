'use client';

import { useCallback, useEffect } from 'react';

const DEFAULT_UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Closing will discard your progress.';

/**
 * Options that control how the unsaved changes guard behaves.
 * @public
 */
export type UseUnsavedChangesGuardOptions = {
    /** Whether there are unsaved edits that need confirmation before closing. */
    hasUnsavedChanges: boolean;
    /**
     * Optional override for the message shown in confirmation dialogs and unload prompts.
     */
    message?: string;
};

/**
 * Result returned by the useUnsavedChangesGuard hook.
 * @public
 */
export type UseUnsavedChangesGuardResult = {
    /**
     * Call before closing a dialog or navigating away; returns true when closing is allowed.
     */
    confirmBeforeClose: () => boolean;
};

/**
 * React hook that blocks modal closing and browser unloads when unsaved changes exist.
 * @public
 */
export function useUnsavedChangesGuard(options: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
    const { hasUnsavedChanges, message } = options;
    const promptMessage = message ?? DEFAULT_UNSAVED_CHANGES_MESSAGE;

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
