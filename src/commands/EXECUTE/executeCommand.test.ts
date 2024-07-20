import { describe, expect, it } from '@jest/globals';
import { parseCommand } from '../_common/parseCommand';

describe('how EXECUTE command in .ptbk.md files works', () => {
    it('should parse EXECUTE command', () => {
        expect(parseCommand('execute prompt template')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute simple template')).toEqual({
            type: 'EXECUTE',
            executionType: 'SIMPLE_TEMPLATE',
        });
        expect(parseCommand('execute script')).toEqual({
            type: 'EXECUTE',
            executionType: 'SCRIPT',
        });
        expect(parseCommand('execute prompt dialog')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_DIALOG',
        });
        expect(parseCommand('  execute    prompt         template')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute PROMPT_TEMPLATE')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
        expect(parseCommand('execute `prompt template`')).toEqual({
            type: 'EXECUTE',
            executionType: 'PROMPT_TEMPLATE',
        });
    });

    it('should fail parsing EXECUTE command', () => {
        expect(() => parseCommand('execute fooo')).toThrowError(/Unknown execution type/i);
        expect(() => parseCommand('execute script prompt template')).toThrowError(/Unknown execution type/i);
    });
});
