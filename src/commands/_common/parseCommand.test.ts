import { describe, expect, it } from '@jest/globals';
import { parseCommand } from './parseCommand.ts.delete';

describe('how parseCommand works', () => {



    it('should fail parsing unknown command', () => {
        expect(() => parseCommand('afasf ddd')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('nothing to get')).toThrowError(/Unknown command/i);
        expect(() => parseCommand('prameter {name}')).toThrowError(/Unknown command/i);
    });


});

