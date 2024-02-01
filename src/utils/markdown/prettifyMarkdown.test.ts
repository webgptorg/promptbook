import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from '../just';
import { prettifyMarkdown } from './prettifyMarkdown';

describe(`prettifyMarkdown`, () => {
    it(`should prettify the markdown`, () => {
        expect(
            prettifyMarkdown(
                spaceTrim(`
                    # Title

                    -   *Item* 1
                    -   _Item_ 2

                    ## Subtitle





                    -   Item 1

                `),
            ),
        ).toBe(
            just(
                spaceTrim(`
                    # Title

                    - *Item* 1
                    - _Item_ 2

                    ## Subtitle

                    - Item 1

                `),
            ),
        );
    });
});
