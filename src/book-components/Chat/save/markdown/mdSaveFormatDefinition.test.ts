import { describe, expect, it } from '@jest/globals';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { mdSaveFormatDefinition } from './mdSaveFormatDefinition';

describe('mdSaveFormatDefinition', () => {
    it('exports readable markdown with a compact Promptbook branding comment', () => {
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

        expect(exportedContent).toContain('<!--');
        expect(exportedContent).toContain('Exported with Promptbook.');
        expect(exportedContent).toContain(PROMPTBOOK_ENGINE_VERSION);
        expect(exportedContent).toContain(BOOK_LANGUAGE_VERSION);
        expect(exportedContent).toContain('# Praha 13 policy chat');
        expect(exportedContent).toContain('## Internal assistant');
        expect(exportedContent).toContain('**Hello, I am your internal assistant.**');
        expect(exportedContent).toContain('My job is to help.');
        expect(exportedContent).toContain('## How to Contribute');
        expect(exportedContent).toContain('- First');
        expect(exportedContent).toContain('_Exported with [Promptbook](https://ptbk.io)._');
        expect(exportedContent).not.toContain('> ## How to Contribute');
    });

    it('renders inline citation markers as numbered Markdown source footnotes', () => {
        const firstSourceUrl =
            'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-etnh35iYn7gbtUZ2oLfKarhHKOyWHF.pdf';
        const secondSourceUrl = 'https://ptbk.io/k/agent-guide.pdf';

        const exportedContent = mdSaveFormatDefinition.getContent({
            title: 'Sources demo',
            participants: [
                {
                    name: 'ASSISTANT',
                    fullname: 'Helpful Agent',
                    color: '#2563eb',
                },
            ],
            messages: [
                {
                    id: 'message-1',
                    sender: 'ASSISTANT',
                    content: `**Answer** cites \u3010${firstSourceUrl}\u3011 and repeats \u3010${firstSourceUrl}\u3011.`,
                    isComplete: true,
                },
                {
                    id: 'message-2',
                    sender: 'ASSISTANT',
                    content: `Another answer cites \u3010${secondSourceUrl}\u3011.`,
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain(`**Answer** cites [1] and repeats [1].`);
        expect(exportedContent).toContain(`Another answer cites [2].`);
        expect(exportedContent).toContain('## Sources');
        expect(exportedContent).toContain(`[1] ${firstSourceUrl}`);
        expect(exportedContent).toContain(`[2] ${secondSourceUrl}`);
        expect(exportedContent.match(new RegExp(`\\[1\\] ${firstSourceUrl}`, 'g'))).toHaveLength(1);
        expect(exportedContent).not.toContain(`\u3010${firstSourceUrl}\u3011`);
        expect(exportedContent).not.toContain(`\u3010${secondSourceUrl}\u3011`);
        expect(exportedContent).not.toContain('0:0');
    });
});
