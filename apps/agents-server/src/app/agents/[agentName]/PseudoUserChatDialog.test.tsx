/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';

jest.mock('../../../components/ServerLanguage/ServerLanguageProvider', () => ({
    useServerLanguage: () => ({
        t: (key: string, variables?: { userName?: string }) => {
            const translations: Record<string, string> = {
                'pseudoUserChat.headerTitle': 'Agent asks you directly',
                'pseudoUserChat.headerSubtitle': 'One reply only',
                'pseudoUserChat.closeAriaLabel': 'Close',
                'pseudoUserChat.replyPlaceholder': 'Write one reply for the agent...',
                'pseudoUserChat.cancelLabel': 'Cancel',
                'pseudoUserChat.sendReplyLabel': 'Send reply',
            };

            if (key === 'pseudoUserChat.replyLabel') {
                return `${variables?.userName || 'User'} reply`;
            }

            return translations[key] || key;
        },
    }),
}));

jest.mock('../../../components/utils/useDirtyModalGuard', () => ({
    useDirtyModalGuard: ({ onClose }: { onClose: () => void }) => ({
        requestClose: onClose,
    }),
}));

describe('PseudoUserChatDialog', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders the internal teammate conversation as a mocked chat transcript', () => {
        const handleSubmit = jest.fn<(message: string) => void>();

        render(
            <PseudoUserChatDialog
                isOpen
                prompt="Can you confirm the preferred deployment window?"
                agentName="Release coordinator"
                userName="User"
                conversation={[
                    {
                        sender: 'AGENT',
                        name: 'Release coordinator',
                        content: 'Can you confirm the preferred deployment window?',
                    },
                    {
                        sender: 'TEAMMATE',
                        name: 'User',
                        content: 'Waiting for one user reply.',
                    },
                ]}
                onSubmit={handleSubmit}
                onClose={jest.fn()}
            />,
        );

        expect(screen.getByText('Release coordinator')).not.toBeNull();
        expect(screen.getByText('Can you confirm the preferred deployment window?')).not.toBeNull();
        expect(screen.getByText('Waiting for one user reply.')).not.toBeNull();
        expect(screen.getByRole('textbox')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Send reply' })).not.toBeNull();
    });
});
