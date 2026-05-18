import { describe, expect, it } from '@jest/globals';
import { mdSaveFormatDefinition } from './mdSaveFormatDefinition';

describe('mdSaveFormatDefinition', () => {
    it('keeps multiline markdown content scoped inside one exported chat message block', () => {
        const exportedContent = mdSaveFormatDefinition.getContent({
            title: 'Praha 13 policy chat',
            participants: [
                {
                    name: 'AGENT',
                    fullname: 'Internal assistant',
                    color: '#2563eb',
                },
            ],
            messages: [
                {
                    id: 'message-1',
                    sender: 'AGENT',
                    content:
                        '**Hello, I am your internal assistant.**\r\n\r\nMy job is to help.\r\n\r\n## How to Contribute\r\n- First\r\n- Second',
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain('**Internal assistant:**');
        expect(exportedContent).toContain('> **Hello, I am your internal assistant.**');
        expect(exportedContent).toContain('> My job is to help.');
        expect(exportedContent).toContain('> ## How to Contribute');
        expect(exportedContent).toContain('> - First');
        expect(exportedContent).not.toContain('\n## How to Contribute');
    });
});
