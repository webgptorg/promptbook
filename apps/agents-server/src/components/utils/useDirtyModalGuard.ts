'use client';

import { useCallback } from 'react';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

/**
 * Options for guarding dialog close attempts when unsaved changes are present.
 */
export type UseDirtyModalGuardOptions = {
    /**
     * Whether the dialog currently contains unsaved edits.
     */
    readonly hasUnsavedChanges: boolean;
    /**
     * Whether close attempts should be ignored (for example while submitting).
     */
    readonly isCloseBlocked?: boolean;
    /**
     * Callback executed once the close attempt is allowed.
     */
    readonly onClose: () => void;
    /**
     * Optional confirmation message shown before discarding edits.
     */
    readonly message?: string;
};

/**
 * Result of the dirty modal guard hook.
 */
export type UseDirtyModalGuardResult = {
    /**
     * Call this for every close attempt (overlay click, Escape, or close buttons).
     */
    readonly requestClose: () => void;
};

/**
 * Creates a reusable close handler that protects unsaved edits in modal dialogs.
 */
export function useDirtyModalGuard(options: UseDirtyModalGuardOptions): UseDirtyModalGuardResult {
    const { hasUnsavedChanges, isCloseBlocked = false, onClose, message } = options;
    const { confirmBeforeClose } = useUnsavedChangesGuard({
        hasUnsavedChanges,
        message,
    });

    const requestClose = useCallback(() => {
        if (isCloseBlocked) {
            return;
        }

        if (!confirmBeforeClose()) {
            return;
        }

        onClose();
    }, [confirmBeforeClose, isCloseBlocked, onClose]);

    return { requestClose };
}
