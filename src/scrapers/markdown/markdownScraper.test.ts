import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { markdownScraper } from './markdownScraper';

describe('how creating knowledge from markdown works', () => {
    it('should scrape simple information from a markdown', async () =>
        expect(
            markdownScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.md')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    filesystemTools: null,
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should NOT scrape irrelevant information', async () =>
        expect(
            markdownScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.md')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    filesystemTools: null,
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/London (is )?.*/i),
            },
        ]));
});

/**
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.md)
 */
