import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { extractJsonBlock } from './extractJsonBlock';

describe('how `extractJsonBlock` works', () => {
    it('return one JSON block', () =>
        expect(
            JSON.parse(
                extractJsonBlock(
                    spaceTrim(`
                        Here is your JSON block:

                        \`\`\`json
                        {"foo": "bar"}
                        \`\`\`
                    `),
                ),
            ),
        ).toEqual({ foo: 'bar' }));

    it('does not matter on declared type, just the validity of the block', () =>
        expect(
            JSON.parse(
                extractJsonBlock(
                    spaceTrim(`
                        Here is your JSON block:

                        \`\`\`foooo
                        {"foo": "bar"}
                        \`\`\`
                    `),
                ),
            ),
        ).toEqual({ foo: 'bar' }));

    it('if given string is a valid JSON as it is, it just returns it', () =>
        expect(
            JSON.parse(
                extractJsonBlock(
                    spaceTrim(`
                      {"foo": "bar"}
                    `),
                ),
            ),
        ).toEqual({ foo: 'bar' }));

    it('does not matter on formatting', () =>
        expect(
            JSON.parse(
                extractJsonBlock(`
                  { "foo"

                  : "bar"          }
                `),
            ),
        ).toEqual({ foo: 'bar' }));

    it('throw error on empty string', () =>
        expect(() => extractJsonBlock('')).toThrowError(/There is no valid JSON block in the markdown/i));

    it('throw error on no block', () =>
        expect(() => extractJsonBlock('There is no block here')).toThrowError(
            /There is no valid JSON block in the markdown/i,
        ));

    it('throw error on invalid json block', () =>
        expect(() =>
            extractJsonBlock(
                spaceTrim(`
                    Here is your JSON block:

                    \`\`\`json
                    {"foo": "bar}
                    \`\`\`
              `),
            ),
        ).toThrowError(/There is no valid JSON block in the markdown/i));

    it('throws error on multiple valid JSON blocks', () =>
        expect(() =>
            extractJsonBlock(
                spaceTrim(`
                    Here is your JSON block:

                    \`\`\`foooo
                    {"foo": "bar"}
                    \`\`\`

                    And here is another one:

                    \`\`\`json
                    {"fooo": "baar"}
                    \`\`\`
                `),
            ),
        ).toThrowError(/There are multiple JSON code blocks in the markdown/i));
});
