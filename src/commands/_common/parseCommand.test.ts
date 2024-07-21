import { describe, expect, it } from '@jest/globals';
import { COMMANDS } from '../index';
import { parseCommand } from './parseCommand';

describe('fail of parseCommand', () => {
    // Note: Other working cases and better tests for each command is in the corresponding command test file

    for (const { name, usagePlaces, examples } of COMMANDS) {
        for (const usagePlace of usagePlaces) {
            it(`should work with ${name} command in ${usagePlace}`, () => {
                for (const example of examples) {
                    expect(() => parseCommand(example, usagePlace)).not.toThrowError();
                }
            });
        }
    }

    it('should fail parsing multi-line command', () => {
        expect(() => parseCommand('execute\nprompt template', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain new line/i,
        );
        expect(() => parseCommand('execute prompt template\n', 'PIPELINE_HEAD')).toThrowError(
            /Can not contain new line/i,
        );
    });

    it('should fail parsing unknown command', () => {
        expect(() => parseCommand('', 'PIPELINE_HEAD')).toThrowError(/Malformed command/i);
        expect(() => parseCommand('afasf ddd', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('nothing to get', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('prameter {name}', 'PIPELINE_HEAD')).toThrowError(/Malformed or unknown command/i);
    });
});
