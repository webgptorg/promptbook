/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import moment from 'moment';
import 'moment/locale/cs';
import type { ComponentProps } from 'react';
import { $getCurrentDate } from '../../../utils/misc/$getCurrentDate';
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
function renderChatMessageItem(message: ChatMessage, overrides: Partial<ComponentProps<typeof ChatMessageItem>> = {}) {
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
            {...overrides}
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

describe('ChatMessageItem lifecycle badges', () => {
    it('hides completed lifecycle badges while keeping queued and running badges visible', () => {
        const chatUiTranslations = {
            lifecycleCompleted: 'Finished',
            lifecycleQueued: 'Queued',
            lifecycleRunning: 'Running',
        };

        const completedRender = renderChatMessageItem(
            {
                id: 'assistant-message-completed-1',
                sender: 'AGENT',
                content: 'Final answer',
                isComplete: true,
                lifecycleState: 'completed',
            },
            { chatUiTranslations },
        );

        expect(screen.queryByText('Finished')).toBeNull();
        completedRender.unmount();

        const queuedRender = renderChatMessageItem(
            {
                id: 'assistant-message-queued-1',
                sender: 'AGENT',
                content: '',
                isComplete: false,
                lifecycleState: 'queued',
            },
            { chatUiTranslations },
        );

        expect(screen.getByText('Queued')).toBeDefined();
        queuedRender.unmount();

        renderChatMessageItem(
            {
                id: 'assistant-message-running-1',
                sender: 'AGENT',
                content: '',
                isComplete: false,
                lifecycleState: 'running',
            },
            { chatUiTranslations },
        );

        expect(screen.getByText('Running')).toBeDefined();
    });
});

describe('ChatMessageItem progress checklist rendering', () => {
    it('renders progress as native markdown checklist content without a separate progress panel container', () => {
        const { container } = renderChatMessageItem(createAssistantProgressMessageFixture());
        const renderedCheckboxes = Array.from(
            container.querySelectorAll('input[type="checkbox"]'),
        ) as Array<HTMLInputElement>;

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
        const renderedCheckboxes = Array.from(
            container.querySelectorAll('input[type="checkbox"]'),
        ) as Array<HTMLInputElement>;

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

    it('hides agent_progress chips while keeping other tool chips and inline progress content visible', () => {
        const { container, rerender } = renderChatMessageItem(
            createAssistantProgressMessageFixture({
                ongoingToolCalls: [
                    {
                        name: 'agent_progress',
                        state: 'PENDING',
                    },
                    {
                        name: 'custom_tool',
                        state: 'PENDING',
                    },
                ],
            }),
        );

        expect(screen.queryByText(/agent_progress/)).toBeNull();
        expect(screen.getByText(/custom_tool/)).toBeDefined();
        expect(container.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);

        rerender(
            <ChatMessageItem
                message={createAssistantProgressMessageFixture({
                    isComplete: true,
                    ongoingToolCalls: [],
                    toolCalls: [
                        {
                            name: 'agent_progress',
                            state: 'COMPLETE',
                            result: '{"ok":true}',
                        },
                        {
                            name: 'custom_tool',
                            state: 'COMPLETE',
                            result: '{"ok":true}',
                        },
                    ],
                })}
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

        expect(screen.queryByText(/agent_progress/)).toBeNull();
        expect(screen.getByText(/custom_tool/)).toBeDefined();
    });

    it('renders assistant messages as article blocks in ARTICLE_MODE', () => {
        const { container } = render(
            <ChatMessageItem
                message={createAssistantMessageFixture()}
                participant={AGENT_PARTICIPANT_FIXTURE}
                participants={[AGENT_PARTICIPANT_FIXTURE]}
                isLastMessage={true}
                setExpandedMessageId={() => undefined}
                isExpanded={false}
                currentRating={0}
                handleRating={() => undefined}
                mode="LIGHT"
                CHAT_VISUAL_MODE="ARTICLE_MODE"
            />,
        );

        const messageContentElement = container.querySelector('.chat-message-content') as HTMLElement | null;
        expect(messageContentElement).not.toBeNull();
        expect(messageContentElement?.style.getPropertyValue('--message-bg-color')).toBe('#ffffff');
        expect(messageContentElement?.style.getPropertyValue('--message-text-color')).toBe('#0f172a');
    });

    it('keeps user messages as bubbles in ARTICLE_MODE', () => {
        const userParticipant: ChatParticipant = {
            name: 'USER',
            fullname: 'User',
            color: '#115EB6',
            isMe: true,
        };

        const { container } = render(
            <ChatMessageItem
                message={{
                    id: 'user-message-1',
                    sender: 'USER',
                    content: 'Hello there',
                    isComplete: true,
                }}
                participant={userParticipant}
                participants={[userParticipant]}
                isLastMessage={true}
                setExpandedMessageId={() => undefined}
                isExpanded={false}
                currentRating={0}
                handleRating={() => undefined}
                mode="LIGHT"
                CHAT_VISUAL_MODE="ARTICLE_MODE"
            />,
        );

        const messageContentElement = container.querySelector('.chat-message-content') as HTMLElement | null;
        expect(messageContentElement).not.toBeNull();
        expect(messageContentElement?.style.getPropertyValue('--message-bg-color')).not.toBe('#ffffff');
    });

    it('toggles message markdown details without bubbling to the outer chat message click handler', async () => {
        const consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation(() => undefined);
        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation(() => undefined);

        try {
            const { container } = renderChatMessageItem({
                id: 'assistant-message-details-1',
                sender: 'AGENT',
                content: '<details><summary>Tool response</summary>Hidden payload</details>',
                isComplete: true,
            });

            const details = container.querySelector<HTMLDetailsElement>('details');
            const summary = screen.getByText('Tool response');

            expect(details?.open).toBe(false);

            fireEvent.click(summary);

            await waitFor(() => expect(details?.open).toBe(true));
            expect(consoleGroupSpy).not.toHaveBeenCalled();
        } finally {
            consoleGroupSpy.mockRestore();
            consoleInfoSpy.mockRestore();
            consoleGroupEndSpy.mockRestore();
        }
    });

    it('renders localized timing metadata when locale and translations are provided', () => {
        const createdAt = $getCurrentDate();
        const expectedTimeLabel = moment(createdAt).locale('cs').format('LT');

        render(
            <ChatMessageItem
                message={{
                    id: 'assistant-message-timing-1',
                    sender: 'AGENT',
                    content: 'Localized timing metadata',
                    createdAt,
                    generationDurationMs: 3_300,
                    isComplete: true,
                }}
                participant={AGENT_PARTICIPANT_FIXTURE}
                participants={[AGENT_PARTICIPANT_FIXTURE]}
                isLastMessage={true}
                setExpandedMessageId={() => undefined}
                isExpanded={false}
                currentRating={0}
                handleRating={() => undefined}
                mode="LIGHT"
                chatLocale="cs"
                timingTranslations={{ answerDurationLabel: '{duration} na odpověď' }}
            />,
        );

        expect(screen.getByText(expectedTimeLabel)).toBeDefined();
        expect(screen.getByText('(3.3s na odpověď)')).toBeDefined();
    });
});
