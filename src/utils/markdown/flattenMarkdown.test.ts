import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../just';
import { flattenMarkdown } from './flattenMarkdown';

describe('flattenMarkdown', () => {
    it('keep simple case', () => {
        expect(flattenMarkdown('# Title')).toBe('# Title');
    });

    it('adds missing h1', () => {
        expect(flattenMarkdown('')).toBe('# Untitled');
    });

    it('keep simple case without h2', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title
                `),
            ),
        );
    });

    it('keep simple case with multi-line text', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title
                    Text below title
                    Text below title
                    Text below title
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title
                    Text below title
                    Text below title
                    Text below title
                `),
            ),
        );
    });

    it('keep simple case with bold/italic text', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title **bold** *italic*
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title **bold** *italic*
                `),
            ),
        );
    });

    it('keep simple case with ul/ol text', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title
                    - ul 1
                    - ul 2
                    - ul 3
                    1. ol 1
                    2. ol 2
                    3. ol 3
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title
                    - ul 1
                    - ul 2
                    - ul 3
                    1. ol 1
                    2. ol 2
                    3. ol 3
                `),
            ),
        );
    });

    it('flatten simple case with text and section', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1
                `),
            ),
        );
    });

    it('ignores structure in code blocks', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    \`\`\`markdown

                    ### Title in code block

                    Text below title in code block

                    \`\`\`
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    \`\`\`markdown

                    ### Title in code block

                    Text below title in code block

                    \`\`\`
                `),
            ),
        );
    });

    it('should work when the first heading is not h1', () => {
        expect(flattenMarkdown(`## Section 1`)).toBe(
            spaceTrim(`
                # Untitled

                ## Section 1
            `),
        );
    });

    it('should work when there is heading level mismatch', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ### Subsection 1.1

                    Text below subsection 1.1
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Subsection 1.1

                    Text below subsection 1.1
                `),
            ),
        );
    });

    it('should work when there are multiple h1', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    # Title 2

                    Text below title 2
              `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Title 2

                    Text below title 2
              `),
            ),
        );
    });

    it('should work when there is h2 at begining', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    ## Subtitle

                    Text below subtitle

                    # Title

                    Text below title
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Untitled

                    ## Subtitle

                    Text below subtitle

                    ## Title

                    Text below title
                `),
            ),
        );
    });

    it('should work when there is no h1 is not at begining', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    Text before title

                    # Title

                    Text below title
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Untitled

                    Text before title

                    ## Title

                    Text below title
              `),
            ),
        );
    });

    it('flatten advanced heading case', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    ## Section 2

                    Text below section 2

                    ### Subsection 2.1

                    Text below subsection 2.1

                    ### Subsection 2.2

                    Text below subsection 2.2
                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                  # Title

                  Text below title

                  ## Section 1

                  Text below section 1

                  ## Section 2

                  Text below section 2

                  ## Subsection 2.1

                  Text below subsection 2.1

                  ## Subsection 2.2

                  Text below subsection 2.2
              `),
            ),
        );
    });

    it('should not be cunfused by heading in comment (which should not be taken as heading)', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    <!--
                    ### Subsection 2.1 (commented)

                    Text below subsection 2.1
                    -->

                    ### Subsection 2.2

                    Text below subsection 2.2
              `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    <!--
                    ### Subsection 2.1 (commented)

                    Text below subsection 2.1
                    -->

                    ## Subsection 2.2

                    Text below subsection 2.2
              `),
            ),
        );
    });

    it('should not be cunfused by heading in code block (which should not be taken as heading)', () => {
        expect(
            flattenMarkdown(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    \`\`\`markdown
                    ### Subsection 2.1 (in code block)

                    Text below subsection 2.1
                    \`\`\`

                    ### Subsection 2.2

                    Text below subsection 2.2
              `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1

                    \`\`\`markdown
                    ### Subsection 2.1 (in code block)

                    Text below subsection 2.1
                    \`\`\`

                    ## Subsection 2.2

                    Text below subsection 2.2
              `),
            ),
        );
    });
});
