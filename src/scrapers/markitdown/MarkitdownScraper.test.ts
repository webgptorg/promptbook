import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { MarkitdownScraper } from './MarkitdownScraper';

describe('how creating knowledge by MarkitdownScraper works', () => {
    const rootDirname = join(__dirname, 'examples');

    const markitdownScraperPromise = (async () =>
        new MarkitdownScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: await $provideLlmToolsForTestingAndScriptsAndPlayground(),
                executables: await $provideExecutablesForNode(),
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a pdf file', () =>
        expect(
            Promise.all([
                markitdownScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.pdf',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([markitdownScraper, sourceHandler]) => markitdownScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    // TODO: !!! Add all samples

    it('should NOT scrape irrelevant information', () =>
        expect(
            Promise.all([
                markitdownScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.pdf',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([markitdownScraper, sourceHandler]) => markitdownScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/London (is )?.*/i),
            },
        ]));
});

/**
 * TODO: [📓] Maybe test all file in examples (not just one by one)
 */
