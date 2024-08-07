import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { prepareKnowledgeFromMarkdown } from './prepareKnowledgeFromMarkdown';

describe('how creating knowledge from markdown works', () => {
    const simpleSampleMarkdown = readFileSync(
        join(__dirname, 'samples/10-simple.md'),
        'utf-8',
    ); /* <- Note: Its OK to use sync in tooling */

    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromMarkdown(simpleSampleMarkdown, {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
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
