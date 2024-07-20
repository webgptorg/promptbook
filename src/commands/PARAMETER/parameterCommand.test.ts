import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { parameterCommandParser } from './parameterCommandParser';

describe('how PARAMETER command in .ptbk.md files works', () => {
    it('should parse PARAMETER command', () => {
        expect(parseCommand('parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('{name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('> {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('{name} Input for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Input for the hero',
        });
        expect(parseCommand('input parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('input parameter {name}')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: null,
        });
        expect(parseCommand('input   parameter {name}          ')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: null,
        });

        expect(parseCommand('OUTPUT parameter {name} Name for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: true,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('   parameter    {name}        Name for the hero         ')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero',
        });
        expect(parseCommand('parameter {name} **Name** for the hero')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: '**Name** for the hero',
        });
        expect(parseCommand('parameter {name} **Name** for `the` {')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: '**Name** for `the` {',
        });
    });

    it('should not be confused by input/output word in parameter name or description', () => {
        expect(parseCommand('> {inputText} The input text')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: false,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        expect(parseCommand('> {outputText} The output text')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });

        expect(parseCommand('PARAMETER {inputText} The input text')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: false,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        expect(parseCommand('PARAMETER {outputText} The output text')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });

        expect(parseCommand('OUTPUT PARAMETER {inputText} The input text')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: true,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        expect(parseCommand('INPUT PARAMETER {outputText} The output text')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });
    });

    it('should fail parsing PARAMETER command', () => {
        expect(() => parseCommand('parameter {}')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter { name }')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter name')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter {name} {name}')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} {name} Name for the hero')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} Name for the hero {name}')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} Name for the hero {name} Name for the hero')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parmeter {name} Name for the hero')).toThrowError(/Unknown command/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of parameterCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
