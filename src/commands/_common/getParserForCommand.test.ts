import { describe, expect, it } from '@jest/globals';
import type { really_any } from '../../utils/organization/really_any';
import { boilerplateCommandParser } from '../_BOILERPLATE/boilerplateCommandParser';
import { modelCommandParser } from '../MODEL/modelCommandParser';
import { getParserForCommand } from './getParserForCommand';
import { stringifyCommand } from './stringifyCommand';

describe('getParserForCommand', () => {
    it('should get the parser', () => {
        expect(getParserForCommand({ type: 'BOILERPLATE', value: 'foo' })).toBe(boilerplateCommandParser);
        expect(getParserForCommand({ type: 'MODEL', key: 'modelVariant', value: 'COMPLETION' })).toBe(
            modelCommandParser,
        );
    });

    it('should fail getting parser for unknown command', () => {
        expect(() => stringifyCommand({} as really_any)).toThrowError(/parser is not found/i);
    });
});
