import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { increaseHeadings } from './increaseHeadings';

describe('increaseHeadings', () => {
    it('should increase headings', () => {
        expect(
            increaseHeadings(
                spaceTrim(`
                    # Heading 1

                    ## Heading 2

                    ### Heading 3
                `),
            ),
        ).toBe(
            spaceTrim(`
                    ## Heading 1

                    ### Heading 2

                    #### Heading 3
        `),
        );
    });

    it('should not increase headings in block', () => {
        expect(
            increaseHeadings(
                spaceTrim(`
                  # Heading 1

                  \`\`\`
                  ## Heading 2
                  \`\`\`

                  ### Heading 3
              `),
            ),
        ).toBe(
            spaceTrim(`
                  ## Heading 1

                  \`\`\`
                  ## Heading 2
                  \`\`\`

                  #### Heading 3
      `),
        );
    });
});
