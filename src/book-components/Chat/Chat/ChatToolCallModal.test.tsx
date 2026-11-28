/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { string_date_iso8601 } from '../../../types/string_token';
import type { ToolCall } from '../../../types/ToolCall';
import { Color } from '../../../utils/color/Color';

jest.mock('../../_common/MonacoEditorWithShadowDom', () => ({
    MonacoEditorWithShadowDom: ({ value }: { value: string }) => <pre>{value}</pre>,
}));

jest.mock('../../BookEditor/BookEditor', () => ({
    BookEditor: () => null,
}));

jest.mock('./TeamToolCallModalContent', () => ({
    TeamToolCallModalContent: () => null,
}));

import { ChatToolCallModal } from './ChatToolCallModal';

/**
 * Creates one timeout tool-call fixture used by modal tests.
 */
function createTimeoutToolCallFixture(): ToolCall {
    return {
        name: 'set_timeout',
        createdAt: '2026-03-21T14:00:00.000Z' as string_date_iso8601,
        arguments: {
            milliseconds: 5_000,
            message: 'Check back in shortly',
        },
        result: {
            action: 'set',
            status: 'set',
            timeoutId: 'tmo_example_123',
            dueAt: '2026-03-21T14:05:00.000Z',
        },
        idempotencyKey: 'tool-call-timeout-1',
        state: 'COMPLETE',
    };
}

/**
 * Creates one browser tool-call fixture used by browser replay modal tests.
 *
 * @param overrides - Optional tool-call overrides for scenario-specific assertions.
 * @returns Browser tool-call fixture.
 */
function createRunBrowserToolCallFixture(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
        name: 'run_browser',
        createdAt: '2026-03-21T14:00:00.000Z' as string_date_iso8601,
        arguments: {
            url: 'https://example.com/start',
            actions: [
                { type: 'navigate', value: 'https://example.com/start' },
                { type: 'click', selector: '#submit' },
                { type: 'wait', value: 500 },
            ],
        },
        result: {
            schema: 'promptbook/run-browser@1',
            initialUrl: 'https://example.com/start',
            finalUrl: 'https://example.com/final',
            finalTitle: 'Example final',
            mode: 'live',
            modeUsed: 'live',
            artifacts: [
                {
                    path: '.playwright-cli/browser-step-1.png',
                    label: 'Step 1',
                    actionSummary: 'Navigate to https://example.com/start',
                },
            ],
            executedActions: [
                { type: 'navigate', url: 'https://example.com/start' },
                { type: 'click', selector: '#submit' },
                { type: 'wait', milliseconds: 500 },
            ],
        },
        logs: [
            { kind: 'browser-session', title: 'Browser ready', message: 'Connected to session' },
            { kind: 'browser-action', message: 'Navigate to https://example.com/start', payload: { actionIndex: 1 } },
            { kind: 'browser-action', message: 'Click #submit', payload: { actionIndex: 2, phase: 'complete' } },
            { kind: 'browser-action', message: 'Wait 500ms', payload: { actionIndex: 3, phase: 'error' } },
        ],
        idempotencyKey: 'tool-call-browser-1',
        state: 'PARTIAL',
        ...overrides,
    };
}

describe('ChatToolCallModal available tools in advanced view', () => {
    it('shows available tools section when availableTools are provided and Advanced mode is active', () => {
        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createTimeoutToolCallFixture()}
                toolCallIdentity="tool-call-timeout-avail"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
                availableTools={[
                    {
                        name: 'web_search',
                        description: 'Search the web for information',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'The search query' },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'set_timeout',
                        description: 'Schedule a timeout',
                        parameters: {
                            type: 'object',
                            properties: {
                                milliseconds: { type: 'number', description: 'Delay in ms' },
                            },
                            required: ['milliseconds'],
                        },
                    },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

        const availableToolsSection = screen.getByText('Available tools').closest('section');
        expect(availableToolsSection).toBeTruthy();
        expect(availableToolsSection?.textContent).toContain('"web_search"');
        expect(availableToolsSection?.textContent).toContain('"set_timeout"');
    });

    it('shows available tools section with empty array when no availableTools are provided', () => {
        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createTimeoutToolCallFixture()}
                toolCallIdentity="tool-call-timeout-no-avail"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

        const availableToolsSection = screen.getByText('Available tools').closest('section');
        expect(availableToolsSection).toBeTruthy();
        expect(availableToolsSection?.textContent?.trim()).toContain('[]');
    });
});

describe('ChatToolCallModal timeout rendering', () => {
    it('renders a friendly default timeout view with accessible dialog controls', () => {
        const onClose = jest.fn();

        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createTimeoutToolCallFixture()}
                toolCallIdentity="tool-call-timeout-1"
                onClose={onClose}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        expect(screen.getByRole('dialog', { name: 'Tool call details' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close tool call details' })).toBeTruthy();
        expect(screen.getByText('Timeout scheduled')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cancel timeout' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Snooze timeout' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'View advanced timeout details' })).toBeTruthy();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('switches to advanced timeout details with raw technical metadata', () => {
        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createTimeoutToolCallFixture()}
                toolCallIdentity="tool-call-timeout-2"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

        const timeoutMetadataSection = screen.getByText('Timeout metadata').closest('section');

        expect(timeoutMetadataSection).toBeTruthy();
        expect(timeoutMetadataSection?.textContent).toContain('"milliseconds": 5000');
        expect(timeoutMetadataSection?.textContent).toContain('"dueAtIsoUtc": "2026-03-21T14:05:00.000Z"');
        expect(timeoutMetadataSection?.textContent).toContain('"timeoutId": "tmo_example_123"');
        expect(timeoutMetadataSection?.textContent).toContain('"idempotencyKey": "tool-call-timeout-1"');
    });

    it('renders locale-aware timeout details with translated accessibility labels', () => {
        const dueAtDate = new Date('2026-03-21T14:05:00.000Z');
        const expectedLocalTime = new Intl.DateTimeFormat('cs', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(dueAtDate);

        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createTimeoutToolCallFixture()}
                toolCallIdentity="tool-call-timeout-cs"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
                locale="cs"
                chatUiTranslations={{
                    toolCallModalTitle: 'Tool call details',
                    toolCallModalCloseLabel: 'Close tool call details',
                    toolCallModalAdvancedLabel: 'Advanced view',
                    toolCallTimeoutTitle: 'Timeout scheduled',
                    toolCallTimeoutCancelButton: 'Cancel',
                    toolCallTimeoutSnoozeButton: 'Snooze',
                    toolCallTimeoutViewAdvancedButton: 'View advanced',
                    toolCallTimeoutActionGroupLabel: 'Timeout quick actions',
                    toolCallTimeoutCancelAriaLabel: 'Cancel timeout',
                    toolCallTimeoutSnoozeAriaLabel: 'Snooze timeout',
                    toolCallTimeoutViewAdvancedAriaLabel: 'View advanced timeout details',
                    toolCallTimeoutPrimaryScheduledLabel: 'Scheduled for {time}.',
                    toolCallTimeoutSecondaryDurationLabel: 'Will retry in {duration}.',
                    toolCallTimeoutDateLabel: 'Date:',
                    toolCallTimeoutMessageLabel: 'Message:',
                    toolCallTimeoutTimezoneLabel: 'Timezone:',
                }}
            />,
        );

        expect(screen.getByRole('dialog', { name: 'Tool call details' })).toBeTruthy();
        expect(screen.getByText(`Scheduled for ${expectedLocalTime}.`)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Cancel timeout' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Snooze timeout' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'View advanced timeout details' })).toBeTruthy();
    });
});

describe('ChatToolCallModal run_browser rendering', () => {
    it('renders browser replay metadata, media, and action states in simple view', () => {
        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createRunBrowserToolCallFixture()}
                toolCallIdentity="tool-call-browser-1"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        expect(screen.getByText('Session replay')).toBeTruthy();
        expect(screen.getByText(/Started at:/)).toBeTruthy();
        expect(screen.getByText(/Ended at:/)).toBeTruthy();
        expect(screen.getByText(/Final page:/)).toBeTruthy();
        expect(screen.getByText(/Mode requested:/)).toBeTruthy();
        expect(screen.getByText(/Mode used:/)).toBeTruthy();
        expect(screen.getByText(/Connected to session/)).toBeTruthy();
        expect(screen.getByText('Step 1')).toBeTruthy();
        expect(screen.getAllByText('Navigate to https://example.com/start')).toHaveLength(2);
        expect(screen.getByText('Click #submit')).toBeTruthy();
        expect(screen.getByText('Wait 500ms')).toBeTruthy();
        expect(screen.getByText('Running')).toBeTruthy();
        expect(screen.getByText('Done')).toBeTruthy();
        expect(screen.getByText('Failed')).toBeTruthy();
    });

    it('renders pending browser replay placeholders while the session is still streaming', () => {
        render(
            <ChatToolCallModal
                isOpen={true}
                toolCall={createRunBrowserToolCallFixture({
                    arguments: {
                        url: 'https://example.com/pending',
                    },
                    result: undefined,
                    logs: [{ kind: 'browser-session', title: 'Browser status', message: 'Session starting' }],
                })}
                toolCallIdentity="tool-call-browser-pending"
                onClose={() => undefined}
                buttonColor={Color.from('#0066cc')}
            />,
        );

        expect(screen.getByText('Visual replay pending')).toBeTruthy();
        expect(screen.getByText('Actions pending')).toBeTruthy();
        expect(screen.getByText(/Session starting/)).toBeTruthy();
    });
});
