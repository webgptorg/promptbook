import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { htmlSaveFormatDefinition } from './htmlSaveFormatDefinition';

describe('htmlSaveFormatDefinition', () => {
    it('renders standalone HTML chat exports with markdown and Promptbook metadata', () => {
        const exportedContent = htmlSaveFormatDefinition.getContent({
            title: 'Support demo',
            participants: [
                {
                    name: 'USER',
                    fullname: 'Pat Doe',
                    color: '#0ea5e9',
                },
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
                    content:
                        '# Summary\n\n- First\n- Second\n\n```ts\nconsole.log("hello");\n```\n\n<details><summary>More</summary>\n\n**Nested** body\n\n</details>',
                    isComplete: true,
                },
            ],
        }) as string;

        expect(htmlSaveFormatDefinition.label).toBe('HTML');
        expect(exportedContent).toContain('<!DOCTYPE html>');
        expect(exportedContent).toContain('<meta name="generator"');
        expect(exportedContent).toContain('<meta name="application-name" content="Promptbook"');
        expect(exportedContent).toContain(PROMPTBOOK_ENGINE_VERSION);
        expect(exportedContent).toContain(BOOK_LANGUAGE_VERSION);
        expect(exportedContent).toContain('<h1');
        expect(exportedContent).toContain('<li>First</li>');
        expect(exportedContent).toContain('<pre><code');
        expect(exportedContent).toContain('<summary>More</summary>');
        expect(exportedContent).toContain('<strong>Nested</strong>');
        expect(exportedContent).toContain('Helpful Agent');
        expect(exportedContent).not.toContain('Featuring your conversation');
        expect(exportedContent).not.toContain('Share with your team');
        expect(exportedContent).not.toContain('Captured messages, ready to share');
    });

    it('renders inline citation markers as numbered HTML source footnotes', () => {
        const firstSourceUrl =
            'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-etnh35iYn7gbtUZ2oLfKarhHKOyWHF.pdf';
        const secondSourceUrl = 'https://ptbk.io/k/agent-guide.pdf';
        const exportedContent = htmlSaveFormatDefinition.getContent({
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

        expect(exportedContent).toContain('<strong>Answer</strong>');
        expect(exportedContent).toContain(
            '<sup data-citation-footnote="1"><a href="#source-1">[1]</a></sup>',
        );
        expect(exportedContent).toContain(
            '<sup data-citation-footnote="2"><a href="#source-2">[2]</a></sup>',
        );
        expect(exportedContent).toContain('<section class="document-sources" aria-label="Sources">');
        expect(exportedContent).toContain(`id="source-1"`);
        expect(exportedContent).toContain(`id="source-2"`);
        expect(exportedContent).toContain(
            `<a href="${firstSourceUrl}" target="_blank" rel="noopener">[1] ${firstSourceUrl}</a>`,
        );
        expect(exportedContent).toContain(
            `<a href="${secondSourceUrl}" target="_blank" rel="noopener">[2] ${secondSourceUrl}</a>`,
        );
        expect(exportedContent.match(/id="source-1"/g)).toHaveLength(1);
        expect(exportedContent).not.toContain(`\u3010${firstSourceUrl}\u3011`);
        expect(exportedContent).not.toContain(`\u3010${secondSourceUrl}\u3011`);
        expect(exportedContent).not.toContain('0:0');
    });
});
