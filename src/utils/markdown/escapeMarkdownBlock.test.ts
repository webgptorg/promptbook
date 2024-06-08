import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from './../just';
import { escapeMarkdownBlock } from './escapeMarkdownBlock';

describe('how escapeMarkdownBlock works', () => {
    it('should work with string that does not need any escaping', () => {
        expect(escapeMarkdownBlock('Foo')).toBe('Foo');
        expect(
            escapeMarkdownBlock(
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

    it('should work with block in block', () => {
        expect(
            escapeMarkdownBlock(
                spaceTrim(`
                    Foo

                    \`\`\`javascript
                    console.log('Bar');
                    \`\`\`

                    Baz
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo

                    \\\`\\\`\\\`javascript
                    console.log('Bar');
                    \\\`\\\`\\\`

                    Baz
                `),
            ),
        );
    });
});
