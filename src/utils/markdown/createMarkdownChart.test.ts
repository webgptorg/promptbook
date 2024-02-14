import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { createMarkdownChart } from './createMarkdownChart';

describe('how createMarkdownChart works', () => {
    it('should work advanced chart', () => {
        expect(
            createMarkdownChart({
                nameHeader: 'Template',
                valueHeader: 'Timeline',
                items: [
                    { title: 'Template 1', from: 0, to: 10 },
                    { title: 'Template 2', from: 4, to: 6 },
                    { title: 'Template 3', from: 3, to: 9 },
                    { title: 'Template 4', from: 6, to: 11 },
                    { title: 'Template 5', from: 11, to: 12 },
                ],
                width: 12,
                unitName: 'seconds',
            }),
        ).toBe(
            spaceTrim(`
                | Template   | Timeline     |
                |------------|--------------|
                | Template 1 | ██████████░░ |
                | Template 2 | ░░░░██░░░░░░ |
                | Template 3 | ░░░██████░░░ |
                | Template 4 | ░░░░░░█████░ |
                | Template 5 | ░░░░░░░░░░░█ |

                _Note: Each █ represents 1 seconds, width of timeline is 12 seconds = 12 squares_
            `),
        );
    });

    it('should render half-tone boxes', () => {
        expect(
            createMarkdownChart({
                nameHeader: 'Template',
                valueHeader: 'Timeline',
                items: [
                    { title: 'Full', from: 0, to: 10 },
                    { title: 'Tiny', from: 4.7, to: 5 },
                ],
                width: 10,
                unitName: 'seconds',
            }),
        ).toBe(
            spaceTrim(`
                  | Template | Timeline   |
                  |----------|------------|
                  | Full     | ██████████ |
                  | Tiny     | ░░░░▓░░░░░ |

                  _Note: Each █ represents 1 seconds, width of timeline is 10 seconds = 10 squares_

            `),
        );
        expect(
            createMarkdownChart({
                nameHeader: 'Template',
                valueHeader: 'Timeline',
                items: [
                    { title: 'Full', from: 0, to: 10 },
                    { title: 'Tiny', from: 5, to: 5.2 },
                ],
                width: 10,
                unitName: 'seconds',
            }),
        ).toBe(
            spaceTrim(`
                | Template | Timeline   |
                |----------|------------|
                | Full     | ██████████ |
                | Tiny     | ░░░░░▓░░░░ |

                _Note: Each █ represents 1 seconds, width of timeline is 10 seconds = 10 squares_

        `),
        );
    });

    it('should round boxes to nearest whole number', () => {
        expect(
            createMarkdownChart({
                nameHeader: 'Template',
                valueHeader: 'Timeline',
                items: [
                    { title: 'Template 1', from: -1.2, to: 9 },
                    { title: 'Template 2', from: 4.5, to: 5.2 },
                    { title: 'Template 3', from: 3.3, to: 8.7 },
                ],
                width: 4,
                unitName: 'seconds',
            }),
        ).toBe(
            spaceTrim(`
              | Template   | Timeline |
              |------------|----------|
              | Template 1 | ████     |
              | Template 2 | ░░▓░     |
              | Template 3 | ░██░     |

              _Note: Each █ represents 2.55 seconds, width of timeline is 10.2 seconds = 4 squares_

          `),
        );
    });

    it('should work in real-life example', () => {
        // TODO: !!!! Fix
        expect(
            createMarkdownChart({
                nameHeader: 'Template',
                valueHeader: 'Timeline',
                items: [
                    { title: '🖋 Překlad popisu', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Účel stránek', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Příprava kontaktů', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Příprava odkazů', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Návrh zadání', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Návrh obrázku', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Prompt k obrázku', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Vylepšení názvu', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Claim pro web', from: 1707866836.134, to: 1707866836.134 },
                    { title: '🖋 Analýza klíčových slov', from: 1707866836.134, to: 1707866836.134 },
                    { title: '📃 Vytvoření obsahu webu', from: 1707866836.134, to: 1707866836.134 },
                    { title: '💌 Kontaktní formulář', from: 1707866836.135, to: 1707866836.135 },
                ],
                width: 36,
                unitName: 'seconds',
            }),
        ).toBe(
            spaceTrim(`

            `),
        );
    });

    // TODO: !!!! ## ⌚ Time chart must make sense
});
