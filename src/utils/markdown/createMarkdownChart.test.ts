import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { createMarkdownChart } from './createMarkdownChart';

describe('how createMarkdownChart works', () => {
    it('should work advanced chart', () => {
        expect(
            createMarkdownChart(
                [
                    { title: 'Template 1', from: 0, to: 10 },
                    { title: 'Template 2', from: 4, to: 6 },
                    { title: 'Template 3', from: 3, to: 9 },
                    { title: 'Template 4', from: 6, to: 11 },
                    { title: 'Template 5', from: 11, to: 12 },
                ],
                12,
            ),
        ).toBe(
            spaceTrim(`
                | Template 1 | 🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛⬛ |
                | Template 2 | ⬛⬛⬛⬛🟦🟦⬛⬛⬛⬛⬛⬛ |
                | Template 3 | ⬛⬛⬛🟦🟦🟦🟦🟦🟦⬛⬛⬛ |
                | Template 4 | ⬛⬛⬛⬛⬛⬛🟦🟦🟦🟦🟦⬛ |
                | Template 5 | ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🟦 |
            `),
        );
    });

    it('should round boxes to nearest whole number', () => {
        expect(
            createMarkdownChart(
                [
                    { title: 'Template 1', from: -1.2, to: 9 },
                    { title: 'Template 2', from: 4.5, to: 5.2 },
                    { title: 'Template 3', from: 3.3, to: 8.7 },
                ],
                4,
            ),
        ).toBe(
            spaceTrim(`
              | Template 1 | 🟦🟦🟦🟦 |
              | Template 2 | ⬛⬛⬛⬛ |
              | Template 3 | ⬛⬛🟦🟦 |

          `),
        );
    });
});
