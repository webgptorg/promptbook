import { describe } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../organization/just';
import { splitMarkdownIntoSections } from './splitMarkdownIntoSections';
import { DEFAULT_TITLE } from '../../config';

describe('how splitMarkdownIntoSections works', () => {
    it('flatten simple cases', () => {
        expect(splitMarkdownIntoSections(``)).toEqual([]);
        expect(
            splitMarkdownIntoSections(
                spaceTrim(`
                    # Title

                    Text below title
                `),
            ),
        ).toEqual(
            just([
                spaceTrim(`
                    # Title

                    Text below title

                `),
            ]),
        );

        expect(
            splitMarkdownIntoSections(
                spaceTrim(`
                    # Title

                    Text below title

                    ## Section 1

                    Text below section 1
                `),
            ),
        ).toEqual(
            just([
                spaceTrim(`
                    # Title

                    Text below title

                `),
                spaceTrim(`
                    ## Section 1

                    Text below section 1
                `),
            ]),
        );
    });

    it('adds "Untitled" if markdown does not starts with heading', () => {
        expect(splitMarkdownIntoSections(`text`)).toEqual([
            spaceTrim(`
                # ${DEFAULT_TITLE}

                text
            `),
        ]);
    });

    it('works withs mismatched headings', () => {
        expect(
            splitMarkdownIntoSections(
                spaceTrim(`
                    ## Heading 2

                    a

                    # Heading 1

                    b

                    # Heading 1

                    c

                    #### Heading 4

                    d

                    # Heading 1

                    e
                `),
            ),
        ).toEqual(
            just([
                spaceTrim(`
                    ## Heading 2

                    a
                `),
                spaceTrim(`
                    # Heading 1

                    b
                `),
                spaceTrim(`
                    # Heading 1

                    c
                `),
                spaceTrim(`
                    #### Heading 4

                    d
                `),
                spaceTrim(`
                    # Heading 1

                    e
                `),
            ]),
        );
    });

    it('flatten advanced case', () => {
        expect(
            splitMarkdownIntoSections(
                spaceTrim(`
                    # Title

                    Text below title

                    - Apple
                    - Banana
                    - Cherry

                    1) Apple
                    2) Banana
                    3) Cherry

                    ## Section 1

                    Text below section 1

                    ## Section 2

                    Text below section 2

                    ### Subsection 2.1

                    Text below subsection 2.1

                    ### Subsection 2.2

                    Text below subsection 2.2

                    <!--
                    ### Subsection 2.3 (commented)

                    Text below subsection 2.3
                    -->

                    \`\`\`markdown
                    ### Subsection 2.4 (in code block)

                    Text below subsection 2.4
                    \`\`\`
                `),
            ),
        ).toEqual(
            just([
                spaceTrim(`
                    # Title

                    Text below title

                    - Apple
                    - Banana
                    - Cherry

                    1) Apple
                    2) Banana
                    3) Cherry

                `),
                spaceTrim(`
                    ## Section 1

                    Text below section 1

                `),
                spaceTrim(`
                    ## Section 2

                    Text below section 2

                `),
                spaceTrim(`
                    ### Subsection 2.1

                    Text below subsection 2.1

                `),
                spaceTrim(`
                    ### Subsection 2.2

                    Text below subsection 2.2

                    <!--
                    ### Subsection 2.3 (commented)

                    Text below subsection 2.3
                    -->

                    \`\`\`markdown
                    ### Subsection 2.4 (in code block)

                    Text below subsection 2.4
                    \`\`\`

                `),
            ]),
        );
    });

    // Note: More things are tested in flattenMarkdown.test.ts which uses splitMarkdownIntoSections
});
