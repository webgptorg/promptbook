import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractAllListItemsFromMarkdown } from './extractAllListItemsFromMarkdown';

describe('how extractAllListItemsFromMarkdown works', () => {
    it('should work with sample with no items', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    Hello World
                `),
            ),
        ).toEqual([]);

        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    Hello World
                    Hello World
                `),
            ),
        ).toEqual([]);

        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    Content with **bold** and *italic* text
                `),
            ),
        ).toEqual([]);
    });

    it('should work with sample with one item', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    - Hello World
                `),
            ),
        ).toEqual(['Hello World']);

        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    - Item with **bold** and *italic* text
                `),
            ),
        ).toEqual(['Item with **bold** and *italic* text']);
    });

    it('should work with sample with multiple items', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    Some text that is not a list item

                    - First item
                    - Second item
                    - Third item
                    - Fourth item

                    Also not a list item - and not a list item too just a hyphen -
                `),
            ),
        ).toEqual(['First item', 'Second item', 'Third item', 'Fourth item']);
    });

    it('should work with sample with multiple items and nested lists', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    - First item
                    - Second item
                        - Nested item 1
                        - Nested item 2
                    - Third item
                    - Fourth item

                `),
            ),
        ).toEqual(['First item', 'Second item', 'Nested item 1', 'Nested item 2', 'Third item', 'Fourth item']);
    });

    it('should work with sample with multiple items and nested lists and markdown', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    - First item
                    - Second item
                        - Nested item 1
                        - Nested item 2
                    - Third item
                    - Fourth item

                    # Another heading

                    - Fifth item
                    - Sixth item
                        - Nested item 3
                        - Nested item 4
                    - Seventh item
                    - Eighth item

                `),
            ),
        ).toEqual([
            'First item',
            'Second item',
            'Nested item 1',
            'Nested item 2',
            'Third item',
            'Fourth item',
            'Fifth item',
            'Sixth item',
            'Nested item 3',
            'Nested item 4',
            'Seventh item',
            'Eighth item',
        ]);
    });

    it('should work with both with ol and ul', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    - First item
                    - Second item
                        - Nested item 1
                        - Nested item 2
                    - Third item
                    - Fourth item

                    # Another heading

                    1. Fifth item
                    2. Sixth item
                        1. Nested item 3
                        2. Nested item 4
                    3. Seventh item
                    4. Eighth item

                `),
            ),
        ).toEqual([
            'First item',
            'Second item',
            'Nested item 1',
            'Nested item 2',
            'Third item',
            'Fourth item',
            'Fifth item',
            'Sixth item',
            'Nested item 3',
            'Nested item 4',
            'Seventh item',
            'Eighth item',
        ]);
    });

    it('should omit items in nested code block', () => {
        expect(
            extractAllListItemsFromMarkdown(
                spaceTrim(`
                    # Hello World

                    - First item
                    - Second item

                    \`\`\`markdown
                    - Nested item 1
                    - Nested item 2
                    \`\`\`

                `),
            ),
        ).toEqual(['First item', 'Second item']);
    });
});
