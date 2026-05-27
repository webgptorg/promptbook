import { describe, expect, it } from '@jest/globals';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown sanitization', () => {
    it('removes raw active HTML while preserving supported details markup', () => {
        const html = renderMarkdown(
            [
                '<script>alert(1)</script>',
                '<style>body{display:none;}</style>',
                '<details open ontoggle=alert(1)>',
                '<summary>Debug</summary>',
                '<img src="https://example.com/safe.png" onerror=\'alert(1)\' alt="Safe image">',
                '</details>',
            ].join('\n'),
        ) as string;

        expect(html).toContain('<details');
        expect(html).toContain('<summary>Debug</summary>');
        expect(html).toContain('<img src="https://example.com/safe.png" alt="Safe image">');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('<style');
        expect(html).not.toContain('ontoggle');
        expect(html).not.toContain('onerror');
    });

    it('removes dangerous URL payloads and disallowed raw SVG markup', () => {
        const html = renderMarkdown(
            [
                '[Safe link](https://example.com/docs)',
                '<a href="jav&#x61;script:alert(1)">Bad link</a>',
                '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" alt="Bad image">',
                '<svg><g onload=alert(1)></g></svg>',
            ].join('\n\n'),
        ) as string;

        expect(html).toContain('href="https://example.com/docs"');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).toContain('<a>Bad link</a>');
        expect(html).toContain('<img alt="Bad image">');
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('data:text/html');
        expect(html).not.toContain('<svg');
        expect(html).not.toContain('onload');
    });

    it('keeps KaTeX output renderable while sanitizing raw MathML attributes', () => {
        const html = renderMarkdown('$x^2$ <math><mi href="javascript:alert(1)">y</mi></math>') as string;

        expect(html).toContain('class="katex"');
        expect(html).toContain('<math');
        expect(html).not.toContain('javascript:');
        expect(html).not.toContain(' href=');
    });
});
