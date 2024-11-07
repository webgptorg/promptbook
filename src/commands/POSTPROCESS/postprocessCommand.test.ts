import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { postprocessCommandParser } from './postprocessCommandParser';

describe('how POSTPROCESS command in .ptbk.md files works', () => {
    it('should parse POSTPROCESS command', () => {
        expect(parseCommand('Postprocess spaceTrim', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocess `spaceTrim`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocess **spaceTrim**', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocess unwrapResult', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'unwrapResult',
        });
    });

    it('should parse POSTPROCESS command in shortcut form', () => {
        expect(parseCommand('PP unwrapResult', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'unwrapResult',
        });
    });

    it('should fail parsing POSTPROCESS command', () => {
        expect(() => parseCommand('Postprocess spaceTrim unwrapResult', 'PIPELINE_TEMPLATE')).toThrowError(
            /Can not have more than one postprocess function/i,
        );
        expect(() => parseCommand('POSTPROCESS @#$%%', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid postprocess function name/i,
        );
        expect(() => parseCommand('Process spaceTrim', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('Postprocess', 'PIPELINE_TEMPLATE')).toThrowError(
            /Postprocess function name is required/i,
        );
        expect(() => parseCommand('POSTPROCESS', 'PIPELINE_TEMPLATE')).toThrowError(
            /Postprocess function name is required/i,
        );
        expect(() => parseCommand('POSTPROCESS as^fadf', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid postprocess function name/i,
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of postprocessCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
