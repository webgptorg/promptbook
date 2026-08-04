import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_BOILERPLATE_COUNT,
    DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE,
    formatBoilerplateCount,
    parseBoilerplateCount,
} from './boilerplateCount';

describe('parseBoilerplateCount', () => {
    it('treats one number as N files with one prompt each', () => {
        expect(parseBoilerplateCount('5')).toEqual({ filesCount: 5, promptsPerFileCount: 1 });
        expect(parseBoilerplateCount('1')).toEqual({ filesCount: 1, promptsPerFileCount: 1 });
        expect(parseBoilerplateCount('100')).toEqual({ filesCount: 100, promptsPerFileCount: 1 });
    });

    it('treats two numbers as N files with M prompts each', () => {
        expect(parseBoilerplateCount('5*1')).toEqual({ filesCount: 5, promptsPerFileCount: 1 });
        expect(parseBoilerplateCount('10*7')).toEqual({ filesCount: 10, promptsPerFileCount: 7 });
    });

    it('ignores whitespace around the notation', () => {
        expect(parseBoilerplateCount('  10 * 7  ')).toEqual({ filesCount: 10, promptsPerFileCount: 7 });
    });

    it('refuses values which are not one or two positive integers', () => {
        for (const invalidCountOption of [
            '0',
            '5*0',
            '0*5',
            '-5',
            '5*-1',
            '2.5',
            '5*2.5',
            '5x2',
            '5*',
            '*5',
            '',
            'foo',
        ]) {
            expect(() => parseBoilerplateCount(invalidCountOption)).toThrow(/--count/);
        }
    });

    it('renders the count back into the `N*M` notation used by the `--count` option', () => {
        expect(formatBoilerplateCount({ filesCount: 10, promptsPerFileCount: 7 })).toBe('10*7');
        expect(DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE).toBe('5*1');
        expect(parseBoilerplateCount(DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE)).toEqual(DEFAULT_BOILERPLATE_COUNT);
    });
});
