import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown sanitization', () => {
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

describe('renderMarkdown inline references', () => {
    const PROJECT_REFERENCES = [
        {
            reference: 'prague-murders-map',
            sourceTextAliases: ['Prague Murders Map'],
            label: 'Prague Murders Map',
            href: '/agents/Prague1/projects/prague-murders-map',
            sourceHrefPrefixes: [
                '/agents/Prague1/projects/prague-murders-map',
                'https://prague-murders-map.live.ptbk.io',
            ],
            title: 'Interactive map of notable Prague murder cases',
        },
    ];

    it('renders a link to an internal project file as the project chip', () => {
        const html = renderMarkdown(
            '[Open the Prague crimes map](/agents/prague1/projects/prague-murders-map/files/index.html)',
            { inlineReferences: PROJECT_REFERENCES },
        ) as string;

        expect(html).toContain('class="inlineReferenceChip"');
        expect(html).toContain('Prague Murders Map');
        expect(html).toContain('href="/agents/Prague1/projects/prague-murders-map"');
        expect(html).not.toContain('files/index.html');
        expect(html).not.toContain('Open the Prague crimes map');
    });

    it('renders a bare project URL as the project chip and keeps the sentence punctuation', () => {
        const html = renderMarkdown('Open https://prague-murders-map.live.ptbk.io/ and enjoy.', {
            inlineReferences: PROJECT_REFERENCES,
        }) as string;

        expect(html).toContain('class="inlineReferenceChip"');
        expect(html).toContain('Prague Murders Map');
        expect(html).toContain('and enjoy.');
        expect(html).not.toContain('>https://prague-murders-map.live.ptbk.io');
    });

    it('renders a bold project display name from an older message as the project chip', () => {
        const html = renderMarkdown('I previously created **Prague Murders Map** for this investigation.', {
            inlineReferences: PROJECT_REFERENCES,
        }) as string;

        expect(html).toContain('class="inlineReferenceChip"');
        expect(html).toContain('Prague Murders Map');
        expect(html).not.toContain('<strong>Prague Murders Map</strong>');
    });

    it('keeps an unrelated markdown link which happens to use a project display name', () => {
        const html = renderMarkdown('[Prague Murders Map](https://example.com/reference)', {
            inlineReferences: PROJECT_REFERENCES,
        }) as string;

        expect(html).toContain('href="https://example.com/reference"');
        expect(html).toContain('>Prague Murders Map</a>');
        expect(html).not.toContain('inlineReferenceChip');
    });

    it('keeps an unrelated bare URL which contains a project display name', () => {
        const html = renderMarkdown('Read https://unrelated-website.example.com before opening the project.', {
            inlineReferences: PROJECT_REFERENCES,
        }) as string;

        expect(html).toContain('href="https://unrelated-website.example.com"');
        expect(html).not.toContain('inlineReferenceChip');
    });

    it('keeps unrelated links, images and code untouched', () => {
        const html = renderMarkdown(
            spaceTrim(`
                [Other project](/agents/Prague1/projects/prague-murders-map-2)

                ![Screenshot](/agents/Prague1/projects/prague-murders-map/files/screenshot.png)

                \`https://prague-murders-map.live.ptbk.io/\`
            `),
            { inlineReferences: PROJECT_REFERENCES },
        ) as string;

        expect(html).toContain('href="/agents/Prague1/projects/prague-murders-map-2"');
        expect(html).toContain('src="/agents/Prague1/projects/prague-murders-map/files/screenshot.png"');
        expect(html).toContain('<code>https://prague-murders-map.live.ptbk.io/</code>');
        expect(html).not.toContain('inlineReferenceChip');
    });

    it('keeps the chip menu links untouched by the bare URL pass', () => {
        const html = renderMarkdown('[[prague-murders-map]]', {
            inlineReferences: [
                {
                    ...PROJECT_REFERENCES[0]!,
                    menu: {
                        status: { label: 'Project is running', isActive: true },
                        options: [
                            {
                                label: 'Open the project in a new tab',
                                href: 'https://prague-murders-map.live.ptbk.io',
                            },
                        ],
                    },
                },
            ],
        }) as string;

        expect(html).toContain('href="https://prague-murders-map.live.ptbk.io"');
        expect(html).toContain('Project is running');
        expect((html.match(/inlineReferenceChip/g) || []).length).toBe(1);
    });
});
