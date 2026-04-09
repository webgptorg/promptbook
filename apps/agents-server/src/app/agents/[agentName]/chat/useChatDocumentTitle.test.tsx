/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useChatDocumentTitle } from './useChatDocumentTitle';

/**
 * Global object extended with React act() environment flag required by concurrent test rendering.
 */
type TestGlobalThis = typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
};

/**
 * Props consumed by the document-title harness.
 */
type ChatDocumentTitleHarnessProps = {
    agentTitle?: string | null;
    activeChatTitle?: string | null;
    untitledChatTitle?: string;
};

/**
 * Returns the leading browser-title segment before inherited suffixes.
 *
 * @returns Leading title segment.
 */
function readLeadingTitleSegment(): string {
    return document.title.split(' | ')[0] || '';
}

/**
 * Minimal harness that applies the chat document-title effect.
 *
 * @param props - Current title inputs.
 * @returns `null`.
 */
function ChatDocumentTitleHarness(props: ChatDocumentTitleHarnessProps): ReactElement | null {
    useChatDocumentTitle(props);
    return null;
}

describe('useChatDocumentTitle', () => {
    it('switches the leading browser-title segment between generic and session-specific chat contexts while preserving inherited agent/server titles', async () => {
        const testGlobal = globalThis as TestGlobalThis;
        testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root: Root = createRoot(container);
        document.title = 'Helpful Assistant | Promptbook Agents Server';

        try {
            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle={null}
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Chat | Helpful Assistant | Promptbook Agents Server');
            expect(readLeadingTitleSegment()).toBe('Chat');
            expect(readLeadingTitleSegment()).not.toBe('Helpful Assistant');

            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle="Release checklist"
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Release checklist | Helpful Assistant | Promptbook Agents Server');
            expect(readLeadingTitleSegment()).toBe('Release checklist');
            expect(readLeadingTitleSegment()).not.toBe('Helpful Assistant');

            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle="Production rollback plan"
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Production rollback plan | Helpful Assistant | Promptbook Agents Server');
            expect(readLeadingTitleSegment()).toBe('Production rollback plan');
            expect(readLeadingTitleSegment()).not.toBe('Helpful Assistant');
        } finally {
            await act(async () => {
                root.unmount();
            });
            container.remove();
            document.title = '';
        }
    });

    it('adds the inherited agent title when the route starts from a generic chat title without agent context', async () => {
        const testGlobal = globalThis as TestGlobalThis;
        testGlobal.IS_REACT_ACT_ENVIRONMENT = true;
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root: Root = createRoot(container);
        document.title = 'Chat | Promptbook Agents Server';

        try {
            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle="Budget follow-up"
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Budget follow-up | Helpful Assistant | Promptbook Agents Server');
            expect(readLeadingTitleSegment()).toBe('Budget follow-up');
            expect(readLeadingTitleSegment()).not.toBe('Helpful Assistant');
        } finally {
            await act(async () => {
                root.unmount();
            });
            container.remove();
            document.title = '';
        }
    });
});
