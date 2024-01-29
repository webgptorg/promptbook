import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';
import { trimCodeBlock } from './trimCodeBlock';

describe('how trimCodeBlock works', () => {
    it('should preserve string without code block', () => {
        expect(
            trimCodeBlock(
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
            trimCodeBlock(
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

    it('should preserve just block starting or ending', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`markdown
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    \`\`\`markdown
                    Foo
                `),
            ),
        );

        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`
                    Foo
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    \`\`\`
                    Foo
                `),
            ),
        );

        expect(
            trimCodeBlock(
                spaceTrim(`
                    Foo
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Foo
                    \`\`\`
                `),
            ),
        );
    });

    it('should trim code block', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                  \`\`\`
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
            trimCodeBlock(
                spaceTrim(`
                  \`\`\`text
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
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`markdown
                    "Bar"
                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    "Bar"
                `),
            ),
        );
    });

    it('should trim ending code block and some whitespace', () => {
        expect(
            trimCodeBlock(
                spaceTrim(`
                    \`\`\`
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
