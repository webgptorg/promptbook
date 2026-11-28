'use client';

import { useEffect, useRef } from 'react';
import { createChatDocumentTitle } from './chatPageTitle';

/**
 * Keeps the browser tab title aligned with the current chat while preserving inherited agent/server suffixes.
 *
 * @param options - Base title context and current active chat state.
 */
export function useChatDocumentTitle(options: {
    agentTitle?: string | null;
    activeChatTitle?: string | null;
    untitledChatTitle?: string;
}): void {
    const { agentTitle, activeChatTitle, untitledChatTitle } = options;
    const baseDocumentTitleRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        if (baseDocumentTitleRef.current === null) {
            baseDocumentTitleRef.current = document.title;
        }

        document.title = createChatDocumentTitle({
            baseDocumentTitle: baseDocumentTitleRef.current,
            agentTitle,
            activeChatTitle,
            untitledChatTitle,
        });
    }, [activeChatTitle, agentTitle, untitledChatTitle]);
}
