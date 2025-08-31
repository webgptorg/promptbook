import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { MarkdownScraper } from './MarkdownScraper';

describe('how creating knowledge from markdown works', () => {
    const rootDirname = join(__dirname, 'examples');
    let markdownScraper: MarkdownScraper;

    beforeAll(async () => {
        const llmTools = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        markdownScraper = new MarkdownScraper(
            { llm: llmTools },
            {
                rootDirname,
            },
        );
    });

    it('should scrape simple information from a markdown', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            knowledgeSourceContent: '10-simple.md',
                        },
                        { fs: $provideFilesystemForNode() },
                        { rootDirname },
                    ),
                )
                .then((sourceHandler) => markdownScraper!.scrape(sourceHandler))
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
                            knowledgeSourceContent: '10-simple.md',
                        },
                        { fs: $provideFilesystemForNode() },
                        { rootDirname },
                    ),
                )
                .then((sourceHandler) => markdownScraper!.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/Lonsdon (is )?.*/i),
            },
        ]));
});

/**
 * TODO: [📓] Maybe test all file in examples (not just 10-simple.md)
 */
