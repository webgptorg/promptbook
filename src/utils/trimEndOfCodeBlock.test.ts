import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from './organization/just';
import { trimEndOfCodeBlock } from './trimEndOfCodeBlock';

describe('how trimEndOfCodeBlock works', () => {
    it('should preserve string without ending code block', () => {
        expect(
            trimEndOfCodeBlock(
                spaceTrim(`
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );
        expect(
            trimEndOfCodeBlock(
                spaceTrim(`
                    Hello:

                    "Bar"
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello:

                    "Bar"
                `),
            ),
        );
    });

    it('should trim ending code block', () => {
        expect(
            trimEndOfCodeBlock(
                spaceTrim(`
                  Foo
                  \`\`\`
              `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                  Foo
              `),
            ),
        );
        expect(
            trimEndOfCodeBlock(
                spaceTrim(`
                    Hello:
                    \`\`\`
                    "Bar"
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello:
                    \`\`\`
                    "Bar"
                `),
            ),
        );
    });

    it('should trim ending code block and some whitespace', () => {
        expect(
            trimEndOfCodeBlock(
                spaceTrim(`
                    Foo
                    \`\`\`
                `) + '\n\n ',
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                `),
            ),
        );
    });
});
