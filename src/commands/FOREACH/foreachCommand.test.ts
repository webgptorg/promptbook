import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { foreachCommandParser } from './foreachCommandParser';

describe('how FOREACH command in .ptbk.md files works', () => {
    it('should parse FOREACH command in PIPELINE_TEMPLATE', () => {
        expect(parseCommand('FOREACH Text Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });
    });

    it('should parse FOREACH command in PIPELINE_TEMPLATE with multiple inputSubparameterNames', () => {
        expect(
            parseCommand('FOREACH Text Line `{customers}` -> `{firstName}`, `{lastName}`', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'newLine',
        });
    });

    it('should parse FOREACH command in PIPELINE_TEMPLATE with specified outputSubparameterName', () => {
        expect(
            parseCommand(
                'FOREACH Csv Row `{customers}` -> `{firstName}`, `{lastName}`, `+{email}`',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });
    });

    it('should parse FOREACH command in multiple formats', () => {
        expect(parseCommand('FOREACH Text Line `{customers}` -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });
        expect(parseCommand('FOREACH Text Line {customers} -> {customer}', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });

        expect(parseCommand('FOREACH Text Line `{customers} -> {customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });

        expect(parseCommand('EACH   Text   Line {customers}     ->   {customer}   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });

        expect(parseCommand('EACH   Text   Line customers    ->   customer   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });

        /*
        TODO: This should work
        expect(parseCommand('FOREACH TEXT LINE `{customers}` ->`{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'TEXT',
            subformatName: 'LINE',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newLine',
        });
        */

        expect(
            parseCommand('FOREACH Csv Row `{customers}` -> {firstName} {lastName}  +{email}', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });
        expect(
            parseCommand('FOREACH Csv Row {customers} -> {firstName} {lastName} +{email}', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand('FOREACH Csv Row `{customers} -> {firstName}, {lastName} +{email}`', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand(
                'FOREACH Csv Row `{customers} -> {firstName}     , {lastName}     +{email}`',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand(
                'EACH   Csv      Row {customers}     ->   {firstName}              {lastName}   +{email}',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand(
                'FOREACH Csv Row `{customers}` -> `{firstName}`, `{lastName}`, `+{email}`',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand(
                'FOREACH Csv Row `{customers}` -> `{firstName}`, `{lastName}`, +`{email}`',
                'PIPELINE_TEMPLATE',
            ),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        expect(
            parseCommand('FOREACH Csv Row `{customers}` -> {firstName}, {lastName}, +{email}', 'PIPELINE_TEMPLATE'),
        ).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'ROW',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'email',
        });

        /*
        TODO: This should work
        expect(parseCommand('FOREACH CSV ROW `{customers}` ->`{firstName}``{lastName}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'CELL',
            parameterName: 'customers',
            inputSubparameterNames: ['firstName', 'lastName'],
            outputSubparameterName: 'newLine',
        });
        */
    });

    it('should parse FOREACH command in shortcut form', () => {
        expect(parseCommand('EACH CSV CELL `{customers} -> `{customer}`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'FOREACH',
            formatName: 'CSV',
            subformatName: 'CELL',
            parameterName: 'customers',
            inputSubparameterNames: ['customer'],
            outputSubparameterName: 'newCell',
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
            /FOREACH command must have at least one input subparameter/i,
        );

        expect(() =>
            parseCommand('FOREACH Csv Row `{customer}` -> {firstName}, {lastName}', 'PIPELINE_TEMPLATE'),
        ).toThrowError(/FOREACH CSV ROW must specify output subparameter/i);

        expect(() =>
            parseCommand(
                'FOREACH Csv Row `{customer}` -> {firstName}, {lastName}, +{email1}, +{email2}',
                'PIPELINE_TEMPLATE',
            ),
        ).toThrowError(/FOREACH command can not have more than one output subparameter/i);
    });

    it(`should work with all examples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of foreachCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
