import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { urlCommandParser } from './urlCommandParser';

describe('how URL command in .book.md files works', () => {
    it('should parse URL command', () => {
        expect(parseCommand('https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD')).toEqual(
            {
                type: 'URL',
                pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
            },
        );
        expect(
            parseCommand(
                '   https://promptbook.studio/webgpt/write-website-content-cs.book.md        ',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('url https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('URL https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });

        /*
        TODO: [🧠][🌘] Should this work:
        expect(
            parseCommand(
                'pipelineurl https://promptbook.studio/webgpt/write-website-content-cs.book',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });

        expect(
            parseCommand(
                'pipelineUrl https://promptbook.studio/webgpt/write-website-content-cs.book',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        */

        expect(
            parseCommand('URL https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });

        /*
        TODO: [🧠][🌘] Should this work:
        expect(
            parseCommand(
                'PIPELINE URL https://promptbook.studio/webgpt/write-website-content-cs.book',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand(
                'PROMPTBOOK URL https://promptbook.studio/webgpt/write-website-content-cs.book',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        */

        expect(
            parseCommand('url *https://promptbook.studio/webgpt/write-website-content-cs.book.md*', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('`https://promptbook.studio/webgpt/write-website-content-cs.book.md`', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
    });

    /*
    TODO: [🧠][🌘] Should this work:
    it('should parse URL command in shortcut form', () => {

        expect(
            parseCommand('ptbkurl https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('ptbkUrl https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('PTBK_URL https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
        expect(
            parseCommand('PTBK URL https://promptbook.studio/webgpt/write-website-content-cs.book', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.book'),
        });
    });
    */

    it('should fail parsing URL command', () => {
        expect(() => parseCommand('URL', 'PIPELINE_HEAD')).toThrowError(/URL is required/i);
        expect(() =>
            parseCommand(
                'URL https://promptbook.studio/webgpt/write-website-content-cs.book.md https://promptbook.studio/webgpt/write-website-content-cs.book',
                'PIPELINE_HEAD',
            ),
        ).toThrowError(/Can not have more than one pipeline URL/i);

        expect(() => parseCommand('url http:^404', 'PIPELINE_HEAD')).toThrowError(/Invalid pipeline URL/i);

        /*
        Note: [👣]
        expect(() => parseCommand('url http://promptbook.studio/write-website-content', 'PIPELINE_HEAD')).toThrowError(
            /Invalid pipeline URL/i,
            // <- TODO: [🐠] /Protocol must be HTTPS/i,
        );
        */

        expect(() =>
            parseCommand(
                'url https://promptbook.studio/webgpt/write-website-content-cs.book.md#keywords',
                'PIPELINE_HEAD',
            ),
        ).toThrowError(
            /Invalid pipeline URL/i,
            // <- TODO: [🐠] /URL must not contain hash/i
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of urlCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
        }
    });
});
