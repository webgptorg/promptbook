import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { foreachCommandParser } from './foreachCommandParser';

describe('how FOREACH command in .ptbk.md files works', () => {
    it('should parse FOREACH command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FOREACH Text Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });
    });

    it('should parse FOREACH command in PIPELINE_TEMPLATE with multiple subparameterNames', () => {
        expect(
            parseCommand('FOREACH Text Line `{customers}` -> `{firstName}`, `{lastName}`', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });
    });

    it('should parse FOREACH command in multiple formats', () => {
        expect(parseCommand('FOREACH Text Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });
        expect(parseCommand('FOREACH Text Line {customers} -> {customer}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });

        expect(parseCommand('FOREACH Text Line `{customers} -> {customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });

        expect(parseCommand('EACH   Text   Line {customers}     ->   {customer}   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });

        /*
        TODO: This should work
        expect(parseCommand('FOREACH TEXT LINE `{customers}` ->`{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            cellName: 'LINE',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });
        */

        expect(parseCommand('FOREACH Csv Row `{customers}` -> {firstName}` `{lastName}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'ROW',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });
        expect(parseCommand('FOREACH Csv Row {customers} -> {firstName} {lastName}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'ROW',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });

        expect(parseCommand('FOREACH Csv Row `{customers} -> {firstName}, {lastName}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'ROW',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });

        expect(
            parseCommand('FOREACH Csv Row `{customers} -> {firstName}     , {lastName}`', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'ROW',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });

        expect(
            parseCommand(
                'EACH   Csv      Row {customers}     ->   {firstName}              {lastName}   ',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'ROW',
            parameterName: 'customers',
            subparameterNames: ['firstName', 'lastName'],
        });

        /*
        TODO: This should work
        expect(parseCommand('FOREACH CSV ROW `{customers}` ->`{firstName}``{lastName}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'CELL',
            parameterName: 'customers',
          subparameterNames: ['firstName', 'lastName'],
        });
        */
    });

    it('should parse FOREACH command in shortcut form', () => {
        expect(parseCommand('EACH CSV CELL `{customers} -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            cellName: 'CELL',
            parameterName: 'customers',
            subparameterNames: ['customer'],
        });
    });

    it('should fail parsing FOREACH command', () => {
        expect(() => parseCommand('FOREACH brr', 'PIPELINE_TEMPLATE')).toThrowError(/Unsupported format "BRR"/i);
        expect(() => parseCommand('FOREACH Text', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid FOREACH command/i);
        expect(() => parseCommand('FOREACH Text Line', 'PIPELINE_TEMPLATE')).toThrowError(/Invalid FOREACH command/i);
        expect(() => parseCommand('FOREACH Text Line `{customer}`', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid FOREACH command/i,
        );
        expect(() => parseCommand('FOREACH Text Line -> `{customer}`', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid FOREACH command/i,
        );
        expect(() => parseCommand('FOREACH Csv Row `{customer}` ->', 'PIPELINE_TEMPLATE')).toThrowError(
            /FOREACH command must have at least one subparameter/i,
        );
        expect(() => parseCommand('FOREACH Text Line customers -> customer', 'PIPELINE_TEMPLATE')).toThrowError(
            /Invalid FOREACH command/i,
        );
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of foreachCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});

/**
 * TODO: [🧠][🦥] Better (less confusing) name for "cell" / "subvalue" / "subparameter"
 */
