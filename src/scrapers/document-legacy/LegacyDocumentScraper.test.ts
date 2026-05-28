import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { join } from 'path';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { LegacyDocumentScraper } from './LegacyDocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'examples');
    const llmTools = new MockedEchoLlmExecutionTools({ isVerbose: false });

    /**
     * Keeps the legacy document-conversion tests independent from external LLM credentials by asserting against the converted markdown.
     */
    function mockMarkdownScrapingToReturnConvertedContent(): void {
        jest.spyOn(MarkdownScraper.prototype, 'scrape').mockImplementation(async (source) => [
            {
                name: 'converted-document',
                title: 'Converted document',
                content: await source.asText(),
                keywords: [],
                index: [],
            },
        ]);
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const legacyDocumentScraperPromise = (async () =>
        new LegacyDocumentScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: llmTools,
                executables: await $provideExecutablesForNode(),
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a (legacy) .doc file', () => {
        mockMarkdownScrapingToReturnConvertedContent();

        return expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.doc',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([legacyDocumentScraper, sourceHandler]) => legacyDocumentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]);
    });

    it('should scrape simple information from a .rtf file', () => {
        mockMarkdownScrapingToReturnConvertedContent();

        return expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.rtf',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([legacyDocumentScraper, sourceHandler]) => legacyDocumentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]);
    });

    it('should NOT scrape irrelevant information', () => {
        mockMarkdownScrapingToReturnConvertedContent();

        return expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.doc',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([legacyDocumentScraper, sourceHandler]) => legacyDocumentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/London (is )?.*/i),
            },
        ]);
    });
});

// TODO: [📓] Maybe test all file in examples (not just 10-simple.doc)
