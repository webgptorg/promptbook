import { describe, expect, it } from '@jest/globals';
import { parseCommand } from './parseCommand';

describe('how BOILERPLATE command in .ptbk.md files works', () => {
    it('should parse BOILERPLATE command', () => {
        expect(parseCommand('BOILERPLATE xxx')).toEqual({
            type: 'BOILERPLATE',
            value: 'xxx',
        });
    });

    it('should parse BOILERPLATE command in shortcut form', () => {
        expect(parseCommand('BP xxx')).toEqual({
            type: 'BOILERPLATE',
            pipelineUrl: 'xxx',
        });
    });

    it('should fail parsing SAMPLE command', () => {
        expect(() => parseCommand('PIPELINE_URL')).toThrowError(/Invalid PIPELINE_URL command/i);
        expect(() =>
            parseCommand(
                'URL https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md',
            ),
        ).toThrowError(/Invalid PIPELINE_URL command/i);

        expect(() => parseCommand('url http:^404')).toThrowError(/Invalid URL/i);

        expect(() => parseCommand('url http://promptbook.studio/write-website-content')).toThrowError(
            /Protocol must be HTTPS/i,
        );

        expect(() =>
            parseCommand('url https://promptbook.studio/webgpt/write-website-content-cs.ptbk.md#keywords'),
        ).toThrowError(/URL must not contain hash/i);
    });
});
