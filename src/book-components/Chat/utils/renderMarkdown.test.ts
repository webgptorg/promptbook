import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
    it('renders common markdown structures used in chat exports', () => {
        const html = renderMarkdown('# Summary\n\n- First\n- Second\n\n`inline`');

        expect(html).toContain('<h1');
        expect(html).toContain('<ul>');
        expect(html).toContain('<li>First</li>');
        expect(html).toContain('<code>inline</code>');
    });

    it('renders fenced code blocks and tables', () => {
        const html = renderMarkdown('```ts\nconsole.log("hello");\n```\n\n| Name | Value |\n| --- | --- |\n| A | 1 |');

        expect(html).toContain('<pre><code');
        expect(html).toContain('console.log("hello");');
        expect(html).toContain('<table');
        expect(html).toContain('<td>A</td>');
    });

    it('keeps details blocks and renders their markdown body', () => {
        const html = renderMarkdown('<details><summary>More</summary>\n\n**Nested** body\n\n</details>');

        expect(html).toContain('<details>');
        expect(html).toContain('<summary>More</summary>');
        expect(html).toContain('<strong>Nested</strong>');
    });

    it('sanitizes unsafe markup from markdown output', () => {
        const html = renderMarkdown(
            '<script>alert("x")</script><a href="javascript:alert(1)" onclick="alert(2)">Unsafe</a>',
        );

        expect(html).not.toContain('<script>');
        expect(html).not.toContain('onclick=');
        expect(html).not.toContain('javascript:');
    });
});
