import { describe, expect, it } from '@jest/globals';
import { parseAgentProjectIndexHtml } from './parseAgentProjectIndexHtml';

describe('parseAgentProjectIndexHtml', () => {
    it('reads the title and the linked icon of one project page', () => {
        expect(
            parseAgentProjectIndexHtml(
                [
                    '<!doctype html>',
                    '<html>',
                    '<head>',
                    '<meta charset="utf-8">',
                    '<title>Prague Murders Map</title>',
                    '<link rel="stylesheet" href="/style.css">',
                    '<link rel="icon" type="image/png" href="/assets/icon.png">',
                    '</head>',
                    '<body></body>',
                    '</html>',
                ].join('\n'),
            ),
        ).toEqual({
            title: 'Prague Murders Map',
            faviconHref: '/assets/icon.png',
        });
    });

    it('decodes entities and collapses whitespace of a multiline title', () => {
        expect(parseAgentProjectIndexHtml('<title>\n  Maps &amp; Murders\n  &#8212; Prague\n</title>').title).toBe(
            'Maps & Murders — Prague',
        );
    });

    it('prefers the plain icon relation over the alternative icon relations', () => {
        expect(
            parseAgentProjectIndexHtml(
                [
                    `<link rel='apple-touch-icon' href='apple-icon.png'>`,
                    '<link rel="shortcut icon" href="legacy.ico">',
                    '<link rel=icon href=favicon.svg>',
                ].join('\n'),
            ).faviconHref,
        ).toBe('favicon.svg');
    });

    it('reports a page without a title and without an icon', () => {
        expect(parseAgentProjectIndexHtml('<html><body><h1>Untitled</h1></body></html>')).toEqual({
            title: null,
            faviconHref: null,
        });
    });
});
