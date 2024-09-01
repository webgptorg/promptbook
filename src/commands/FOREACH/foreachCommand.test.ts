import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { foreachCommandParser } from './foreachCommandParser';

describe('how FOREACH command in .ptbk.md files works', () => {
    it('should parse FOREACH command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FOREACH List Line -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });
    });

    it('should parse FOREACH command in multiple formats', () => {
        expect(parseCommand('FOREACH List Line -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });
        expect(parseCommand('FOREACH List Line -> {customer}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });

        expect(parseCommand('FOREACH List Line `-> {customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });

        expect(parseCommand('EACH   List   Line ->   {customer}   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });

        expect(parseCommand('FOREACH CSV CELL ->`{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });
    });

    it('should parse FOREACH command in shortcut form', () => {
        expect(parseCommand('EACH bar', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            // <- TODO: [🍭] !!!!!!
        });
    });

    it('should fail parsing FOREACH command', () => {
        expect(() => parseCommand('FOREACH brr', 'PIPELINE_TEMPLATE')).toThrowError(/FOREACH command !!!!!!/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of foreachCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
