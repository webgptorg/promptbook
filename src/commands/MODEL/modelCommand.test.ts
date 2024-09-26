import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';
import { modelCommandParser } from './modelCommandParser';

describe('how MODEL command in .ptbk.md files works', () => {
    it('should parse MODEL command', () => {
        expect(parseCommand('MODEL VARIANT Completion', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });

        expect(parseCommand('MODEL VARIANT Chat', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });

        expect(parseCommand('MODEL VARIANT Completion   ', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'COMPLETION',
        });

        // <- Note: [🤖]

        expect(parseCommand('MODEL VARIANT `CHAT`', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelVariant',
            value: 'CHAT',
        });

        expect(parseCommand('MODEL NAME gpt-4-1106-preview', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-4-1106-preview',
        });

        expect(parseCommand('MODEL NAME gpt-3.5-turbo-instruct', 'PIPELINE_TEMPLATE')).toEqual({
            type: 'MODEL',
            key: 'modelName',
            value: 'gpt-3.5-turbo-instruct',
        });
    });

    it('should fail parsing MODEL VARIANT command', () => {
        expect(() => parseCommand('MODEL wet', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown model key/i);
        expect(() => parseCommand('MODEL {script}', 'PIPELINE_TEMPLATE')).toThrowError(/Unknown model key/i);
    });

    it(`should work with all samples`, () => {
        // Note: This is tested also in the common test file parseCommand.test.ts
        for (const example of modelCommandParser.examples) {
            expect(() => parseCommand(example, 'PIPELINE_HEAD')).not.toThrowError();
            expect(() => parseCommand(example, 'PIPELINE_TEMPLATE')).not.toThrowError();
        }
    });
});
