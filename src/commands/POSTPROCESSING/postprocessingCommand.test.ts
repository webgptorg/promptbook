import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { postprocessingCommandParser } from './postprocessingCommandParser';

describe('how POSTPROCESSING command in .ptbk.md files works', () => {
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
        expect(parseCommand('Post-process spaceTrim', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'spaceTrim',
        });
        expect(parseCommand('Postprocessing unwrapResult', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'unwrapResult',
        });
    });

    it('should parse POSTPROCESSING command in shortcut form', () => {
        expect(parseCommand('PP unwrapResult', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'POSTPROCESS',
            functionName: 'unwrapResult',
        });
    });

    it('should fail parsing POSTPROCESS command', () => {
        expect(() => parseCommand('Postprocess spaceTrim unwrapResult', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid POSTPROCESSING command/i,
        );
        expect(() => parseCommand('Process spaceTrim', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('Postprocess', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid POSTPROCESSING command/i);
        expect(() => parseCommand('POSTPROCESSING', 'PIPELINE_TEMPLATE')).toThrowError(
            /requires exactly one argument/i,
        );
        expect(() => parseCommand('POSTPROCESSING as^fadf', 'PIPELINE_TEMPLATE')).toThrowError(/--/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of postprocessingCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
