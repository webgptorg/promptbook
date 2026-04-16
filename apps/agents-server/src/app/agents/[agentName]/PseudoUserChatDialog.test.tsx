/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';

jest.mock('../../../components/ServerLanguage/ServerLanguageProvider', () => ({
    useServerLanguage: () => ({
        t: (key: string, variables?: Record<string, string>) => {
            if (key === 'pseudoUserChat.headerTitle') {
                return 'Agent asks you directly';
            }
            if (key === 'pseudoUserChat.headerSubtitle') {
                return 'One reply only';
            }
            if (key === 'pseudoUserChat.closeAriaLabel') {
                return 'Close dialog';
            }
            if (key === 'pseudoUserChat.replyLabel') {
                return `${variables?.userName || 'User'} reply`;
            }
            if (key === 'pseudoUserChat.replyPlaceholder') {
                return 'Write one reply for the agent...';
            }
            if (key === 'pseudoUserChat.cancelLabel') {
                return 'Cancel';
            }
            if (key === 'pseudoUserChat.sendReplyLabel') {
                return 'Send reply';
            }
            return key;
        },
    }),
}));

describe('PseudoUserChatDialog', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders the mocked teammate conversation transcript above the reply composer', () => {
        const handleSubmit = jest.fn<(message: string) => void>();

        render(
            <PseudoUserChatDialog
                isOpen
                prompt="Need details about your budget."
                conversation={[
                    {
                        sender: 'AGENT',
                        name: 'Trip planner',
                        content: 'Need details about your budget.',
                    },
                    {
                        sender: 'TEAMMATE',
                        name: 'User',
                        content: 'Waiting for one user reply.',
                    },
                ]}
                agentName="Trip planner"
                userName="User"
                onSubmit={handleSubmit}
                onClose={jest.fn()}
            />,
        );

        expect(screen.getAllByText('Need details about your budget.')).toHaveLength(1);
        expect(screen.queryByText('Waiting for one user reply.')).not.toBeNull();
        expect(screen.queryByText('Trip planner')).not.toBeNull();
        expect(screen.queryByText('User')).not.toBeNull();
        expect(screen.getByLabelText('User reply')).not.toBeNull();
    });
});
