import { parseAgentProjectIndexHtml } from './parseAgentProjectIndexHtml';

describe('parseAgentProjectIndexHtml', () => {
    it('extracts a normalized title and local favicon paths from an HTML entrypoint', () => {
        expect(
            parseAgentProjectIndexHtml({
                fileName: 'index.html',
                content:
                    '<!doctype html><html><head><title> Prague &amp; Murders Map </title><link rel="shortcut icon" href="/assets/map.svg?version=1"><link rel="icon" href="https://example.com/icon.png"></head></html>',
            }),
        ).toEqual({
            title: 'Prague & Murders Map',
            faviconRelativePaths: ['assets/map.svg'],
        });
    });

    it('ignores external and unsafe favicon links', () => {
        expect(
            parseAgentProjectIndexHtml({
                fileName: 'index.html',
                content:
                    '<html><head><link rel="icon" href="data:image/svg+xml,test"><link rel="icon" href="https://example.com/favicon.ico"><link rel="icon" href="#fragment"></head></html>',
            }).faviconRelativePaths,
        ).toEqual([]);
    });

    it('returns empty metadata when the project has no HTML entrypoint', () => {
        expect(parseAgentProjectIndexHtml(null)).toEqual({
            title: null,
            faviconRelativePaths: [],
        });
    });
});
