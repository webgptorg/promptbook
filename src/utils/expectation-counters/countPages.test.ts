import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { countPages } from './countPages';

describe('countPages', () => {
    it('should return 0 for an empty string', () => {
        expect(countPages('')).toBe(0);
    });

    it('should return 1 for a string with one page', () => {
        expect(countPages('Page 1')).toBe(1);
    });

    it('should return the correct count for a string with multiple pages', () => {
        expect(
            countPages(
                spaceTrim(`

                    Page 1
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor.

                    Page 2
                    Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur.

                `),
            ),
        ).toBe(2);
    });
});
