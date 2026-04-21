/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Color } from '../../../utils/color/Color';

const mockMockedChat = jest.fn(
    (props: {
        title: string;
        messages: Array<{ id: string; sender: string; content: string }>;
        delayConfig?: {
            beforeFirstMessage?: number;
            showIntermediateMessages?: number;
        };
    }) => (
        <div data-testid="mocked-chat">
            <div>{props.title}</div>
            <div>{`showIntermediateMessages:${props.delayConfig?.showIntermediateMessages ?? 'undefined'}`}</div>
            {props.messages.map((message) => (
                <div key={message.id}>{`${message.sender}:${message.content}`}</div>
            ))}
        </div>
    ),
);

jest.mock('../MockedChat/MockedChat', () => ({
    MockedChat: (props: {
        title: string;
        messages: Array<{ id: string; sender: string; content: string }>;
        delayConfig?: {
            beforeFirstMessage?: number;
            showIntermediateMessages?: number;
        };
    }) => mockMockedChat(props),
}));

jest.mock('./ChatToolCallModalComponents', () => ({
    TeamHeaderProfile: ({ label }: { label: string }) => <div>{label}</div>,
}));

jest.mock('./renderToolCallDetails', () => ({
    renderToolCallDetails: () => <div>tool-call-details</div>,
}));

import { TeamToolCallModalContent } from './TeamToolCallModalContent';

describe('TeamToolCallModalContent', () => {
    beforeEach(() => {
        mockMockedChat.mockClear();
    });

    it('renders the stored teammate conversation immediately inside MockedChat', () => {
        render(
            <TeamToolCallModalContent
                teamResult={{
                    teammate: {
                        url: 'https://s6.ptbk.io/agents/slave',
                        label: 'slave',
                    },
                    conversation: [
                        {
                            sender: 'AGENT',
                            name: 'Master',
                            content: 'What CNAMEs are in the records?\n\nContext:\nPlease provide the CNAME DNS records for the domain ptbk.io.',
                        },
                        {
                            sender: 'TEAMMATE',
                            name: 'slave',
                            content: 'The CNAME records for ptbk.io are:\n\n- books.ptbk.io -> webgptorg.github.io',
                        },
                    ],
                }}
                toolCallDate={new Date('2026-04-20T13:38:45.419Z')}
                teamToolCallSummary={{ toolCalls: [], citations: [] }}
                selectedTeamToolCall={null}
                onSelectTeamToolCall={() => undefined}
                onClearSelectedTeamToolCall={() => undefined}
                teamProfiles={{}}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        expect(screen.getByText('Master')).toBeTruthy();
        expect(screen.getAllByText('slave').length).toBeGreaterThan(0);
        expect(screen.getByTestId('mocked-chat')).toBeTruthy();
        expect(screen.getByText('showIntermediateMessages:2')).toBeTruthy();
        expect(screen.getByText(/AGENT:What CNAMEs are in the records/)).toBeTruthy();
        expect(screen.getByText(/TEAMMATE:The CNAME records for ptbk\.io are/)).toBeTruthy();

        expect(mockMockedChat).toHaveBeenCalledWith(
            expect.objectContaining({
                delayConfig: expect.objectContaining({
                    beforeFirstMessage: 0,
                    showIntermediateMessages: 2,
                }),
                messages: [
                    expect.objectContaining({
                        sender: 'AGENT',
                    }),
                    expect.objectContaining({
                        sender: 'TEAMMATE',
                    }),
                ],
            }),
        );
    });

    it('falls back to request and response when the structured conversation is missing', () => {
        render(
            <TeamToolCallModalContent
                teamResult={{
                    teammate: {
                        url: 'https://s6.ptbk.io/agents/slave',
                        label: 'slave',
                    },
                    request: 'What CNAMEs are in the records?',
                    response: 'The CNAME records are listed below.',
                }}
                toolCallDate={new Date('2026-04-20T13:38:45.419Z')}
                teamToolCallSummary={{ toolCalls: [], citations: [] }}
                selectedTeamToolCall={null}
                onSelectTeamToolCall={() => undefined}
                onClearSelectedTeamToolCall={() => undefined}
                teamProfiles={{}}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        expect(screen.getByText('showIntermediateMessages:2')).toBeTruthy();
        expect(screen.getByText('AGENT:What CNAMEs are in the records?')).toBeTruthy();
        expect(screen.getByText('TEAMMATE:The CNAME records are listed below.')).toBeTruthy();
    });
});
