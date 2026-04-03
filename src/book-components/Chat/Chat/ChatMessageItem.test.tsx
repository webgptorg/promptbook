/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatMessageItem } from './ChatMessageItem';

jest.mock('../CodeBlock/CodeBlock', () => ({
    CodeBlock: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

jest.mock('./ChatMessageMap', () => ({
    ChatMessageMap: () => null,
}));

/**
 * Shared assistant participant fixture used by chat-message citation tests.
 */
const AGENT_PARTICIPANT_FIXTURE: ChatParticipant = {
    name: 'AGENT',
    fullname: 'Agent',
    color: '#ffffff',
};

/**
 * Creates one minimal assistant message fixture for citation-footnote rendering tests.
 */
function createAssistantMessageFixture(): ChatMessage {
    return {
        id: 'assistant-message-1',
        sender: 'AGENT',
        content: 'Alpha [0:0] and beta [8:13].',
        citations: [
            { id: '0:0', source: 'document123.doc' },
            { id: '8:13', source: 'document123.doc' },
        ],
        isComplete: true,
    };
}

/**
 * Creates one assistant progress message fixture with structured progress payload.
 */
function createAssistantProgressMessageFixture(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'assistant-progress-message-1',
        sender: 'AGENT',
        content: '',
        isComplete: false,
        progressCard: {
            title: 'Working on your request',
            now: 'Collecting relevant references',
            items: [
                {
                    id: 'step-1',
                    text: 'Collect references',
                    status: 'completed',
                },
                {
                    id: 'step-2',
                    text: 'Draft summary',
                    status: 'pending',
                },
            ],
            next: 'Finalize response',
            isVisible: true,
        },
        ...overrides,
    };
}

/**
 * Renders one chat message item with stable defaults used by these tests.
 */
function renderChatMessageItem(message: ChatMessage) {
    return render(
        <ChatMessageItem
            message={message}
            participant={AGENT_PARTICIPANT_FIXTURE}
            participants={[AGENT_PARTICIPANT_FIXTURE]}
            isLastMessage={true}
            setExpandedMessageId={() => undefined}
            isExpanded={false}
            currentRating={0}
            handleRating={() => undefined}
            mode="LIGHT"
        />,
    );
}

describe('ChatMessageItem citation footnotes', () => {
    it('renders repeated document citations as one footnote chip and removes raw marker ids from the message body', () => {
        const { container } = renderChatMessageItem(createAssistantMessageFixture());

        expect(container.textContent).not.toContain('[0:0]');
        expect(container.textContent).not.toContain('[8:13]');
        expect(container.querySelectorAll('sup[data-citation-footnote="1"]')).toHaveLength(2);
        expect(screen.getAllByTitle('document123.doc')).toHaveLength(1);
        expect(screen.getByTitle('document123.doc').textContent).not.toContain('[0:0]');
        expect(screen.getByTitle('document123.doc').textContent).not.toContain('[8:13]');
    });
});

describe('ChatMessageItem progress checklist rendering', () => {
    it('renders progress as native markdown checklist content without a separate progress panel container', () => {
        const { container } = renderChatMessageItem(createAssistantProgressMessageFixture());
        const renderedCheckboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')) as Array<
            HTMLInputElement
        >;

        expect(container.querySelector('section')).toBeNull();
        expect(renderedCheckboxes.length).toBe(5);
        expect(renderedCheckboxes.filter((checkbox) => checkbox.checked)).toHaveLength(1);
        expect(container.textContent).not.toContain('- [ ]');
        expect(container.textContent).not.toContain('- [x]');
    });

    it('renders nested checklist items when progress item text contains nested markdown checklists', () => {
        const { container } = renderChatMessageItem(
            createAssistantProgressMessageFixture({
                progressCard: {
                    items: [
                        {
                            id: 'step-parent',
                            text: 'Prepare plan\n- [x] Gather context\n- [ ] Validate assumptions',
                            status: 'pending',
                        },
                    ],
                    isVisible: true,
                },
            }),
        );
        const renderedCheckboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')) as Array<
            HTMLInputElement
        >;

        expect(renderedCheckboxes.length).toBe(3);
        expect(renderedCheckboxes.filter((checkbox) => checkbox.checked)).toHaveLength(1);
        expect(renderedCheckboxes.filter((checkbox) => !checkbox.checked)).toHaveLength(2);
    });

    it('keeps existing markdown message formatting unchanged when progress payload is absent', () => {
        const { container } = renderChatMessageItem({
            id: 'assistant-message-format-1',
            sender: 'AGENT',
            content: '**Bold** text with regular markdown.',
            isComplete: true,
        });

        expect(container.querySelector('strong')?.textContent).toBe('Bold');
        expect(container.textContent).toContain('text with regular markdown.');
        expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    });

    it('preserves tool call chips while rendering progress checklist markdown', () => {
        const { container } = renderChatMessageItem(
            createAssistantProgressMessageFixture({
                ongoingToolCalls: [
                    {
                        name: 'custom_tool',
                        state: 'PENDING',
                    },
                ],
            }),
        );

        expect(screen.getByText(/custom_tool/)).toBeDefined();
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
    });
});
