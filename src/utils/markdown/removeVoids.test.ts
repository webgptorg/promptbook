import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
//import { removeVoids } from './removeVoids';

describe('removeVoids', () => {
    it('should remove voids from simple text', () => {
        expect(
            removeVoids(
                spaceTrim(`
                    Hello [VOID]
                `),
            ),
        ).toBe('');
    });

    it('should remove voids from multiline text', () => {
        expect(
            removeVoids(
                spaceTrim(`
                  Hello [VOID]

                  Hello World
              `),
            ),
        ).toBe(
            spaceTrim(`
                  Hello World
          `),
        );
    });

    it('should remove void section', () => {
        expect(
            removeVoids(
                spaceTrim(`
                    # Hello [VOID]

                    Some content
                `),
            ),
        ).toBe(
            spaceTrim(`
                    # Hello World

                    Some content
            `),
        );
        expect(
            removeVoids(
                spaceTrim(`
                  # Hello

                  ## Hello [VOID]

                  I say hello to the void

                  ## Hello World

                  I say hello to the world
              `),
            ),
        ).toBe(
            spaceTrim(`
                  # Hello

                  ## Hello World

                  I say hello to the world
          `),
        );
    });

    it('should remove void list item', () => {
        expect(
            removeVoids(
                spaceTrim(`
                    - I say hello to the void
                    - Hello [VOID]
                    - World
                `),
            ),
        ).toBe(
            spaceTrim(`
                    - I say hello to the void
                    - World
            `),
        );

        // TODO: Probbably same behavior for numbered list (with reordering)
    });

    it('should remove void block', () => {
        expect(
            removeVoids(
                spaceTrim(`
                  # Hello

                  \`\`\`javascript
                  console.log('[VOID]');
                  \`\`\`
              `),
            ),
        ).toBe(
            spaceTrim(`
                  # Hello
          `),
        );

        // TODO: Probbably same behavior for numbered list (with reordering)
    });
});

export function removeVoids(content: string): string {
    return spaceTrim(content.replace(/\[VOID\]/gs, ''));
}
