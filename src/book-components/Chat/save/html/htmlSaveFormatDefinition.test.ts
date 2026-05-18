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
});
