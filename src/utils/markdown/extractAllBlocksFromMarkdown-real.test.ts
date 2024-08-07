import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import spaceTrim from 'spacetrim';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

describe('how extractAllBlocksFromMarkdown works in real sample', () => {
    it('should work with sample with no code blocks', () => {
        expect(
            extractAllBlocksFromMarkdown(
                readFileSync('samples/templates/30-escaping.ptbk.md', 'utf8'),
                // <- Note: Its OK to use sync in tests
            ),
        ).toContainEqual({
            blockNotation: '>',
            content: spaceTrim(`

                Rewrite the function below:

                \`\`\`javascript
                function greet() {
                    return 'Hello Betty';
                }
                \`\`\`

                To return "Goodbye" from the function instead of "Hello".
            `),
            language: null,
        });
    });
});
