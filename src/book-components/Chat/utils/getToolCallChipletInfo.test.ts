import { describe, expect, it } from '@jest/globals';
import type { ToolCall } from '../../../types/ToolCall';
import { buildToolCallChipText, getToolCallChipletInfo } from './getToolCallChipletInfo';

/**
 * Creates a minimal tool call fixture for chiplet tests.
 */
function createToolCall(partial: Partial<ToolCall>): ToolCall {
    return {
        name: partial.name || 'unknown_tool',
        ...partial,
    };
}

describe('getToolCallChipletInfo', () => {
    it('returns teammate chip metadata for TEAM tool results', () => {
        const chipletInfo = getToolCallChipletInfo(
            createToolCall({
                name: 'team',
                result: {
                    teammate: {
                        label: 'Research agent',
                        url: 'https://example.com/agents/research',
                    },
                },
            }),
        );

        expect(chipletInfo).toEqual({
            text: 'Research agent',
            agentData: {
                label: 'Research agent',
                url: 'https://example.com/agents/research',
            },
        });
    });

    it('uses the email subject when available', () => {
        const chipletInfo = getToolCallChipletInfo(
            createToolCall({
                name: 'send_email',
                arguments: {
                    subject: 'Quarterly report',
                },
            }),
        );

        expect(buildToolCallChipText(chipletInfo)).toBe('📧 Quarterly report');
    });

    it('shows the first matching memory preview for memory tools', () => {
        const chipletInfo = getToolCallChipletInfo(
            createToolCall({
                name: 'retrieve_user_memory',
                result: {
                    memories: [
                        {
                            content: 'Customer prefers weekly status updates',
                        },
                    ],
                },
            }),
        );

        expect(buildToolCallChipText(chipletInfo)).toBe('🧠 Customer prefers weekly status updates');
    });

    it('prefers the hostname for URL-based tools', () => {
        const chipletInfo = getToolCallChipletInfo(
            createToolCall({
                name: 'fetch_url_content',
                arguments: {
                    url: 'https://docs.promptbook.studio/reference',
                },
            }),
        );

        expect(buildToolCallChipText(chipletInfo)).toBe('🌐 docs.promptbook.studio');
    });
});
