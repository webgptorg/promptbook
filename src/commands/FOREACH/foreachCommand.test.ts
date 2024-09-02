import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { foreachCommandParser } from './foreachCommandParser';

describe('how FOREACH command in .ptbk.md files works', () => {
    it('should parse FOREACH command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FOREACH List Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'LIST',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterName: 'customer',
        });
    });

    it('should parse FOREACH command in multiple formats', () => {
        expect(parseCommand('FOREACH List Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'LIST',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterName: 'customer',
        });
        expect(parseCommand('FOREACH List Line {customers} -> {customer}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'LIST',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterName: 'customer',
        });

        expect(parseCommand('FOREACH List Line `{customers} -> {customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'LIST',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterName: 'customer',
        });

        expect(parseCommand('EACH   List   Line {customers}     ->   {customer}   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'LIST',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterName: 'customer',
        });

        /*
        TODO: This should work
        expect(parseCommand('FOREACH CSV CELL `{customers}` ->`{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'CELL',
            parameterName: 'customers',
            subparameterName: 'customer',
        });
        */
    });

    it('should parse FOREACH command in shortcut form', () => {
        expect(parseCommand('EACH CSV CELL `{customers} -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'CELL',
            parameterName: 'customers',
            subparameterName: 'customer',
        });
    });

    it('should fail parsing FOREACH command', () => {
        expect(() => parseCommand('FOREACH brr', 'PIPELINE_TEMPLATE')).toThrowError(/Unsupported format "BRR"/i);
        expect(() => parseCommand('FOREACH List', 'PIPELINE_TEMPLATE')).toThrowError(/* TODO: !!!!!! */);
        expect(() => parseCommand('FOREACH List Line', 'PIPELINE_TEMPLATE')).toThrowError(/* TODO: !!!!!! */);
        expect(() => parseCommand('FOREACH List Line `{customer}`', 'PIPELINE_TEMPLATE'))
            .toThrowError
            /* TODO: !!!!!! */
            ();
        expect(() => parseCommand('FOREACH List Line -> `{customer}`', 'PIPELINE_TEMPLATE'))
            .toThrowError
            /* TODO: !!!!!! */
            ();
        expect(() => parseCommand('FOREACH List Line customers -> customer', 'PIPELINE_TEMPLATE'))
            .toThrowError
            /* TODO: !!!!!! */
            ();
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of foreachCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
