'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Duration of clipboard feedback shown after copying an agent URL or email.
 *
 * @private function of useAgentContextMenuItems
 */
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

/**
 * Supported transient clipboard feedback states.
 *
 * @private function of useAgentContextMenuItems
 */
type CopyFeedback = 'URL' | 'Email';

/**
 * Manages temporary clipboard feedback for copy actions.
 *
 * @returns Current feedback label and copy handler.
 *
 * @private function of useAgentContextMenuItems
 */
export function useAgentContextMenuCopyFeedback(): {
    readonly copyFeedback: CopyFeedback | null;
    readonly handleCopy: (value: string, label: CopyFeedback) => Promise<void>;
} {
    const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
    const copyTimeoutRef = useRef<number | null>(null);

    /**
     * Clears any pending clipboard feedback timeout.
     */
    const clearCopyTimeout = useCallback(() => {
        if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => clearCopyTimeout, [clearCopyTimeout]);

    /**
     * Copies a value to the clipboard and shows short-lived success feedback.
     *
     * @param value - Text to copy.
     * @param label - Feedback label for the copied value.
     */
    const handleCopy = useCallback(
        async (value: string, label: CopyFeedback) => {
            try {
                await navigator.clipboard.writeText(value);
                clearCopyTimeout();
                setCopyFeedback(label);
                copyTimeoutRef.current = window.setTimeout(() => setCopyFeedback(null), COPY_FEEDBACK_TIMEOUT_MS);
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        },
        [clearCopyTimeout],
    );

    return { copyFeedback, handleCopy };
}
