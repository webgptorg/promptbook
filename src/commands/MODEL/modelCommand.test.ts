import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { modelCommandParser } from './modelCommandParser';

describe('how MODEL command in .ptbk.md files works', () => {
    it('should parse MODEL command', () => {
        expect(parseCommand('MODEL VARIANT Completion')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });

        expect(parseCommand('MODEL VARIANT Chat')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });

        expect(parseCommand('MODEL VARIANT Completion   ')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });

        expect(parseCommand('MODEL VARIANT Embed')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'EMBEDDING',
        });

        expect(parseCommand('MODEL VARIANT Embedding')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'EMBEDDING',
        });

        // <- Note: [🤖]

        expect(parseCommand('MODEL VARIANT `CHAT`')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });

        expect(parseCommand('MODEL NAME gpt-4-1106-preview')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-4-1106-preview',
        });

        expect(parseCommand('MODEL NAME gpt-3.5-turbo-instruct')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-3.5-turbo-instruct',
        });
    });

    it('should fail parsing MODEL VARIANT command', () => {
        expect(() => parseCommand('MODEL wet')).toThrowError(/Unknown model key/i);
        expect(() => parseCommand('MODEL {script}')).toThrowError(/Unknown model key/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of modelCommandParser.examples) {
            expect(() => parseCommand(example)).not.toThrowError();
        }
    });
});
