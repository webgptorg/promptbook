import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { parameterCommandParser } from './parameterCommandParser';

describe('how PARAMETER command in .ptbk.md files works', () => {
    it('should parse PARAMETER command', () => {
        expect(parseCommand('parameter {name} Name for the hero1', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero1',
        });

        // Note: [🦈]
        expect(parseCommand('{name} Name for the hero2', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero2',
        });

        // Note: [🦈] and [🐡]
        expect(parseCommand('> {name} Name for the hero3', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero3',
        });

        // Note: [🦈]
        expect(parseCommand('{name} Input for the hero4', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Input for the hero4',
        });
        expect(parseCommand('input parameter {name} Name for the hero5', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero5',
        });
        expect(parseCommand('input parameter {name}', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: null,
        });
        expect(parseCommand('input   parameter {name}          ', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: null,
        });

        expect(parseCommand('OUTPUT parameter {name} Name for the hero6', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: true,
            parameterName: 'name',
            parameterDescription: 'Name for the hero6',
        });
        expect(parseCommand('   parameter    {name}        Name for the hero7         ', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: 'Name for the hero7',
        });

        /*
        TODO: When [🥶] fixed, allow formatting in parameters
        expect(parseCommand('parameter {name} **Name** for the hero8', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: '**Name** for the hero8',
        });
        expect(parseCommand('parameter {name} **Name** for `the` {', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: '**Name** for `the` {',
        });
        */
    });

    it('should not be confused by input/output word in parameter name or description', () => {
        // Note: [🐡]
        expect(parseCommand('> {inputText} The input text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: false,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        // Note: [🐡]
        expect(parseCommand('> {outputText} The output text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });

        expect(parseCommand('PARAMETER {inputText} The input text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: false,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        expect(parseCommand('PARAMETER {outputText} The output text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });

        expect(parseCommand('OUTPUT PARAMETER {inputText} The input text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false, // <- Note: Not input despite the word input in the parameter name
            isOutput: true,
            parameterName: 'inputText',
            parameterDescription: 'The input text',
        });

        expect(parseCommand('INPUT PARAMETER {outputText} The output text', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: true,
            isOutput: false, // <- Note: Not output despite the word output in the parameter name
            parameterName: 'outputText',
            parameterDescription: 'The output text',
        });

        expect(parseCommand('parameter name', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'name',
            parameterDescription: null,
        });

        expect(parseCommand('parameter {jméno}', 'PIPELINE_HEAD')).toEqual({
            type: 'PARAMETER',
            isInput: false,
            isOutput: false,
            parameterName: 'jmeno',
            parameterDescription: null,
        });
    });

    it('should fail parsing PARAMETER command', () => {
        expect(() => parseCommand('parameter {}', 'PIPELINE_HEAD')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter { name }', 'PIPELINE_HEAD')).toThrowError(/Invalid parameter/i);
        expect(() => parseCommand('parameter {name} {name}', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} {name} Name for the hero9', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() => parseCommand('parameter {name} Name for the hero9 {name}', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain another parameter in description/i,
        );
        expect(() =>
            parseCommand('parameter {name} Name for the hero {name} Name for the herox', 'PIPELINE_HEAD'),
        ).toThrowError(/Can not contain another parameter in description/i);
        expect(() => parseCommand('parmeter {name} Name for the heroy', 'PIPELINE_HEAD')).toThrowError(
            /Unknown command/i,
        );
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of parameterCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
