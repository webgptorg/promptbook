import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { urlCommandParser } from './urlCommandParser';

describe('how URL command in .ptbk.md files works', () => {
    it('should parse URL command', () => {
        expect(
            parseCommand('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand(
                '   https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md        ',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('url https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });

        /*
        TODO: [🧠][🌘] Should this work:
        expect(
            parseCommand(
                'pipelineurl https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });

        expect(
            parseCommand(
                'pipelineUrl https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        */

        expect(
            parseCommand('URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });

        /*
        TODO: [🧠][🌘] Should this work:
        expect(
            parseCommand(
                'PIPELINE URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand(
                'PROMPTBOOK URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
                'PIPELINE_HEAD',
            ),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        */

        expect(
            parseCommand('url *https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md*', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('`https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md`', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
    });

    /*
    TODO: [🧠][🌘] Should this work:
    it('should parse URL command in shortcut form', () => {

        expect(
            parseCommand('ptbkurl https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('ptbkUrl https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('PTBK_URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
        expect(
            parseCommand('PTBK URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md', 'PIPELINE_HEAD'),
        ).toEqual({
            type: 'URL',
            pipelineUrl: new URL('https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md'),
        });
    });
    */

    it('should fail parsing URL command', () => {
        expect(() => parseCommand('URL', 'PIPELINE_HEAD')).toThrowError(/URL is required/i);
        expect(() =>
            parseCommand(
                'URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
                'PIPELINE_HEAD',
            ),
        ).toThrowError(/Can not have more than one pipeline URL/i);

        expect(() => parseCommand('url http:^404', 'PIPELINE_HEAD')).toThrowError(/Invalid pipeline URL/i);

        expect(() => parseCommand('url http://promptbook.studio/write-website-content', 'PIPELINE_HEAD')).toThrowError(
            /Invalid pipeline URL/i,
            // <- TODO: [🐠] /Protocol must be HTTPS/i,
        );

        expect(() =>
            parseCommand(
                'url https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md#keywords',
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
