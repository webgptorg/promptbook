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
    it('switches the browser title between generic and session-specific chat contexts without leaking the agent name', async () => {
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

            expect(document.title).toBe('Chat | Promptbook Agents Server');
            expect(document.title).not.toContain('Helpful Assistant');

            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle="Release checklist"
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Chat: Release checklist | Promptbook Agents Server');
            expect(document.title).not.toContain('Helpful Assistant');

            await act(async () => {
                root.render(
                    <ChatDocumentTitleHarness
                        agentTitle="Helpful Assistant"
                        activeChatTitle="Production rollback plan"
                        untitledChatTitle="New chat"
                    />,
                );
            });

            expect(document.title).toBe('Chat: Production rollback plan | Promptbook Agents Server');
            expect(document.title).not.toContain('Helpful Assistant');
        } finally {
            await act(async () => {
                root.unmount();
            });
            container.remove();
            document.title = '';
        }
    });

    it('preserves an existing non-chat suffix when the route already starts from a generic chat title', async () => {
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

            expect(document.title).toBe('Chat: Budget follow-up | Promptbook Agents Server');
            expect(document.title).not.toContain('Helpful Assistant');
        } finally {
            await act(async () => {
                root.unmount();
            });
            container.remove();
            document.title = '';
        }
    });
});
