import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { markdownScraper } from './markdownScraper';

describe('how creating knowledge from markdown works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            markdownScraper.scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.md')), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                filesystemTools: null,
            }),

            // Note: [0] Not comparing with .toEqual because of index is looooonnnngggg list of numbers
        ).resolves.toMatchObject([
            {
                content: 'Springfield is a city located in Illinois, United States.',
                // [0]> index: [],
                keywords: ['Springfield: An Illinois City'],
                name: 'springfield-an-illinois-city',
                title: 'Springfield: An Illinois City',
            },
            {
                content: 'Springfield is the county seat of Sangamon County.',
                // [0]> index: [],
                keywords: ['Springfield: Sangamon County Seat'],
                name: 'springfield-sangamon-county-seat',
                title: 'Springfield: Sangamon County Seat',
            },
            {
                content:
                    'As of 2019, Springfield had a population of 10,566, making it the sixth most populous city in Illinois.',
                // [0]> index: [],
                keywords: ["Springfield: Illinois' Sixth Largest City"],
                name: 'springfield-illinois-sixth-largest-city',
                title: "Springfield: Illinois' Sixth Largest City",
            },
        ]));
});

/**
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.md)
 */
