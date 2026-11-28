import { spaceTrim } from 'spacetrim';
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
                    content: spaceTrim(`
                        # Summary

                        - First
                        - Second

                        \`\`\`ts
                        console.log("hello");
                        \`\`\`

                        <details><summary>More</summary>

                        **Nested** body

                        </details>
                    `),
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
        expect(exportedContent).toContain('<sup data-citation-footnote="1"><a href="#source-1">[1]</a></sup>');
        expect(exportedContent).toContain('<sup data-citation-footnote="2"><a href="#source-2">[2]</a></sup>');
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
        expect(exportedContent).not.toContain('[0:0]');
        expect(exportedContent).not.toContain('【0:0†');
    });

    it('strips quick message and action buttons from exported HTML message bodies', () => {
        const exportedContent = htmlSaveFormatDefinition.getContent({
            title: 'Buttons demo',
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
                    content: spaceTrim(`
                        How can I help you today?

                        [Show me a demo](?message=Show%20me%20a%20demo)
                        [Run quick action](?action=doSomething)
                    `),
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain('How can I help you today?');
        expect(exportedContent).not.toContain('?message=');
        expect(exportedContent).not.toContain('?action=');
        expect(exportedContent).not.toContain('Show me a demo');
        expect(exportedContent).not.toContain('Run quick action');
    });

    it('omits messages that would render empty after stripping quick buttons', () => {
        const exportedContent = htmlSaveFormatDefinition.getContent({
            title: 'Quick buttons only demo',
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
                    content: 'Welcome!',
                    isComplete: true,
                },
                {
                    id: 'message-2',
                    sender: 'ASSISTANT',
                    content: '[Continue](?message=Continue)',
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain('Welcome!');
        expect(exportedContent.match(/<article class="message /g)).toHaveLength(1);
    });

    it('aligns user messages to the right and agent messages to the left in the chat bubble layout', () => {
        const exportedContent = htmlSaveFormatDefinition.getContent({
            title: 'Bubble layout demo',
            participants: [
                {
                    name: 'USER',
                    fullname: 'Pat Doe',
                    color: '#0ea5e9',
                    isMe: true,
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
                    sender: 'USER',
                    content: 'Hello',
                    isComplete: true,
                },
                {
                    id: 'message-2',
                    sender: 'ASSISTANT',
                    content: 'Hi there!',
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain('<article class="message message--mine"');
        expect(exportedContent).toContain('<article class="message message--theirs"');
        expect(exportedContent).toContain('class="message-bubble"');
        expect(exportedContent).toContain('class="message-avatar message-avatar--initial"');
        expect(exportedContent).toContain('<span>P</span>');
        expect(exportedContent).toContain('<span>H</span>');
    });

    it('sanitizes rendered markdown inside standalone HTML exports', () => {
        const exportedContent = htmlSaveFormatDefinition.getContent({
            title: 'Sanitized export',
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
                    content: spaceTrim(`
                        <details open ontoggle=alert(1)><summary>Safe summary</summary>Safe body</details>

                        <img src="https://example.com/safe.png" onerror='alert(1)' alt="Safe image">

                        <a href="jav&#x61;script:alert(1)">Bad link</a>

                        <svg><g onload=alert(1)></g></svg>
                    `),
                    isComplete: true,
                },
            ],
        }) as string;

        expect(exportedContent).toContain('<summary>Safe summary</summary>');
        expect(exportedContent).toContain('<img src="https://example.com/safe.png" alt="Safe image">');
        expect(exportedContent).toContain('<a>Bad link</a>');
        expect(exportedContent).not.toContain('ontoggle');
        expect(exportedContent).not.toContain('onerror');
        expect(exportedContent).not.toContain('javascript:');
        expect(exportedContent).not.toContain('<svg');
    });
});
