import { describe, expect, it } from '@jest/globals';
import { COMMANDS } from '../index';
import { parseCommand } from './parseCommand';

describe('fail of parseCommand', () => {
    // Note: Other working cases and better tests for each command is in the corresponding command test file

    for (const { name, examples } of COMMANDS) {
        it(`should work with ${name} command`, () => {
            for (const example of examples) {
                expect(() => parseCommand(example)).not.toThrowError();
            }
        });
    }

    it('should fail parsing multi-line command', () => {
        expect(() => parseCommand('execute\nprompt template')).toThrowError(/Can not contain new line/i);
        expect(() => parseCommand('execute prompt template\n')).toThrowError(/Can not contain new line/i);
    });

    it('should fail parsing unknown command', () => {
        expect(() => parseCommand('')).toThrowError(/Malformed command/i);
        expect(() => parseCommand('afasf ddd')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('nothing to get')).toThrowError(/Malformed or unknown command/i);
        expect(() => parseCommand('prameter {name}')).toThrowError(/Malformed or unknown command/i);
    });
});
