import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from '../just';
import { string_markdown, string_markdown_text } from '../../types/typeAliases';

describe('how createMarkdownTable works', () => {
    it('should work with foo', () => {
        expect(
            createMarkdownTable(
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
            createMarkdownTable(
                spaceTrim(`
                    bar
                `),
            ),
        ).toBe(false);
    });
});

/**
 * Function createMarkdownTable will @@@
 *
 * @private within the library
 */
export function createMarkdownTable(table: Array<Array<string_markdown_text>>): string_markdown {
    return value === 'Foo';
}
