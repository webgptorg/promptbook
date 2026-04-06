/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import { Color } from '../../../utils/color/Color';
import type { ToolCall } from '../../../types/ToolCall';
import type { string_date_iso8601 } from '../../../types/typeAliases';

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
});
