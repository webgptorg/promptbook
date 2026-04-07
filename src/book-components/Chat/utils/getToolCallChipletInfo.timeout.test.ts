import { describe, expect, it } from '@jest/globals';
import type { ToolCall } from '../../../types/ToolCall';
import { buildToolCallChipText, getToolCallChipletInfo } from './getToolCallChipletInfo';

/**
 * Creates one timeout tool call fixture used by chiplet tests.
 */
function createSetTimeoutToolCall(): ToolCall {
    return {
        name: 'set_timeout',
        arguments: {
            milliseconds: 5_000,
            message: 'Follow up later',
        },
        result: {
            action: 'set',
            status: 'set',
            timeoutId: 'tmo_123',
            dueAt: '2026-03-21T14:05:00.000Z',
        },
    };
}

describe('getToolCallChipletInfo timeout labels', () => {
    it('shows a concise timeout chip label without internal ids', () => {
        const info = getToolCallChipletInfo(createSetTimeoutToolCall(), 'en-US');
        const expectedLocalTime = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date('2026-03-21T14:05:00.000Z'));

        expect(buildToolCallChipText(info)).toBe(`⏱️ Timeout: ${expectedLocalTime}`);
    });

    it('prefers localized title overrides for non-dynamic chip labels', () => {
        const info = getToolCallChipletInfo(
            {
                name: 'assistant_preparation',
            },
            undefined,
            {
                assistant_preparation: 'Preparing agent',
            },
        );

        expect(buildToolCallChipText(info)).toBe('✨ Preparing agent');
    });
});
