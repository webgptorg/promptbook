import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { string_markdown } from '../../types/typeAliases';
import { FromToItems } from '../FromtoItems';
import { just } from '../just';

describe('how createMarkdownChart works', () => {
    it('should work with foo', () => {
        expect(
            createMarkdownChart(
                spaceTrim(`
                    Foo
        
                    Bar
        
                    Baz
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
        
                    Bar
        
                    Baz
                `),
            ),
        );
    });

    it('should NOT work with bar', () => {
        expect(
            createMarkdownChart(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false);
    });
});

/**
 * Function createMarkdownChart will @@@
 *
 * @private within the library
 */
export function createMarkdownChart(items: FromToItems): string_markdown {
    return value === 'Foo';
}
