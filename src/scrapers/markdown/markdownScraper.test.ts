import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { markdownScraper } from './markdownScraper';

describe('how creating knowledge from markdown works', () => {
    const rootDirname = join(__dirname, 'samples');

    it('should scrape simple information from a markdown', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.md',
                        },
                        { rootDirname },
                    ),
                )
                .then((options) =>
                    markdownScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                    }),
                )
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.md',
                        },
                        { rootDirname },
                    ),
                )
                .then((options) =>
                    markdownScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                    }),
                )
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
