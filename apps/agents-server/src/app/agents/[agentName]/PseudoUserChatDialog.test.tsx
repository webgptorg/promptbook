/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';

jest.mock('@promptbook-local/components', () => ({
    MockedChat: ({
        title,
        messages,
        participants,
    }: {
        title: string;
        messages: ReadonlyArray<{ id: string; content: string }>;
        participants: ReadonlyArray<{ name: string; fullname?: string }>;
    }) => (
        <div data-testid="mocked-chat">
            <div>{title}</div>
            {participants.map((participant) => (
                <div key={participant.name}>{participant.fullname || participant.name}</div>
            ))}
            {messages.map((message) => (
                <div key={message.id}>{message.content}</div>
            ))}
        </div>
    ),
}));

jest.mock('../../../components/Portal/Dialog', () => ({
    Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../components/ServerLanguage/ServerLanguageProvider', () => ({
    useServerLanguage: () => ({
        t: (key: string, variables?: { userName?: string }) => {
            if (key === 'pseudoUserChat.replyLabel') {
                return `Reply as ${variables?.userName || 'User'}`;
            }

            return key;
        },
    }),
}));

jest.mock('../../../components/utils/useDirtyModalGuard', () => ({
    useDirtyModalGuard: ({ onClose }: { onClose: () => void }) => ({
        requestClose: onClose,
    }),
}));

describe('PseudoUserChatDialog', () => {
    it('renders the internal TEAM conversation inside the popup transcript area', () => {
        render(
            <PseudoUserChatDialog
                isOpen={true}
                prompt="Can you confirm the launch date?"
                agentName="Release coordinator"
                userName="User"
                conversation={[
                    {
                        sender: 'AGENT',
                        name: 'Release coordinator',
                        content: 'Can you confirm the launch date?',
                    },
                    {
                        sender: 'TEAMMATE',
                        name: 'User',
                        content: 'Waiting for one user reply.',
                    },
                ]}
                onSubmit={() => undefined}
                onClose={() => undefined}
            />,
        );

        expect(screen.getByTestId('mocked-chat')).not.toBeNull();
        expect(screen.getByText('Chat between Release coordinator and User')).not.toBeNull();
        expect(screen.getByText('Can you confirm the launch date?')).not.toBeNull();
        expect(screen.getByText('Waiting for one user reply.')).not.toBeNull();
        expect(screen.getByText('Reply as User')).not.toBeNull();
    });
});
