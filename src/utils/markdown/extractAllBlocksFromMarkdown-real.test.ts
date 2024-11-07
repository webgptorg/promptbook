import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import spaceTrim from 'spacetrim';
import { extractAllBlocksFromMarkdown } from './extractAllBlocksFromMarkdown';

describe('how extractAllBlocksFromMarkdown works in real example', () => {
    it('should work with example with no code blocks', () => {
        expect(
            extractAllBlocksFromMarkdown(
                readFileSync('examples/pipelines/30-escaping.ptbk.md', 'utf-8'),
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
