import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { parseMarkdownSection } from './parseMarkdownSection';

describe('how parseMarkdownSection works', () => {
    it('should work with h1 section', () =>
        expect(
            parseMarkdownSection(
                spaceTrim(`
                    # Title

                    Content
                `),
            ),
        ).toEqual({
            title: 'Title',
            level: 1,
            content: 'Content',
        }));

    it('should work with h2 section', () =>
        expect(
            parseMarkdownSection(
                spaceTrim(`
                      ## Subtitle

                      Content
                  `),
            ),
        ).toEqual({
            title: 'Subtitle',
            level: 2,
            content: 'Content',
        }));

    it('should NOT work with non-markdown-section string', () =>
        expect(() => parseMarkdownSection(``)).toThrowError(/Markdown section must start with heading/));

    expect(() =>
        parseMarkdownSection(
            spaceTrim(`
                **This is not a title**

                Content without title

                - Foo
                - Bar
            `),
        ),
    ).toThrowError(/Markdown section must start with heading/);
});
