import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown sanitization', () => {
    it('promotes matching legacy project links into the configured inline reference chip', () => {
        const html = renderMarkdown('[Open the project](/agents/agent/projects/website/files/index.html)', {
            inlineReferences: [
                {
                    reference: 'website',
                    label: 'Website',
                    href: '/agents/agent/projects/website',
                    sourceHrefPrefixes: ['/agents/agent/projects/website/files/'],
                    menu: {
                        status: {
                            label: 'Project is running',
                            isActive: true,
                        },
                        options: [
                            {
                                label: 'Open the project in a new tab',
                                href: 'https://website.example.com',
                            },
                            {
                                label: 'Open the project page in a new tab',
                                href: '/agents/agent/projects/website',
                            },
                        ],
                    },
                },
            ],
        }) as string;

        expect(html).toContain('<details');
        expect(html).toContain('>Website</span>');
        expect(html).toContain('href="https://website.example.com"');
        expect(html).not.toContain('/agents/agent/projects/website/files/index.html');
    });

    it('removes raw active HTML while preserving supported details markup', () => {
        const html = renderMarkdown(
            spaceTrim(`
                <script>alert(1)</script>
                <style>body{display:none;}</style>
                <details open ontoggle=alert(1)>
                <summary>Debug</summary>
                <img src="https://example.com/safe.png" onerror='alert(1)' alt="Safe image">
                </details>
            `),
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
            spaceTrim(`
                [Safe link](https://example.com/docs)

                <a href="jav&#x61;script:alert(1)">Bad link</a>

                <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" alt="Bad image">

                <svg><g onload=alert(1)></g></svg>
            `),
        ) as string;

        expect(html).toContain('href="https://example.com/docs"');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).not.toContain('target="_blank"');
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
