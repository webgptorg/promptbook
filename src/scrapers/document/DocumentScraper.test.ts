import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { join } from 'path';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { DocumentScraper } from './DocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'examples');
    const convertedDocumentFixturePath = join(__dirname, '..', 'markdown', 'examples', '10-simple.md');
    const llmTools = new MockedEchoLlmExecutionTools({ isVerbose: false });

    /**
     * Keeps the document-conversion tests independent from external LLM credentials by asserting against the converted markdown.
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

    /**
     * Keeps unit coverage of the scraper flow independent from the locally installed Pandoc executable.
     */
    function mockDocumentConversion(): void {
        jest.spyOn(DocumentScraper.prototype, '$convert').mockResolvedValue({
            filename: convertedDocumentFixturePath,
            isDestroyed: false,
            destroy: async () => undefined,
        } satisfies ScraperIntermediateSource);
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const documentScraperPromise = (async () =>
        new DocumentScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: llmTools,
                executables: {},
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a .docx file', () => {
        mockMarkdownScrapingToReturnConvertedContent();
        mockDocumentConversion();

        return expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.docx',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([documentScraper, sourceHandler]) => documentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]);
    });

    it('should scrape simple information from a .odt file', () => {
        mockMarkdownScrapingToReturnConvertedContent();
        mockDocumentConversion();

        return expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.odt',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([documentScraper, sourceHandler]) => documentScraper.scrape(sourceHandler))
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
        mockDocumentConversion();

        return expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        knowledgeSourceContent: '10-simple.docx',
                    },
                    { fs: $provideFilesystemForNode() },
                    { rootDirname },
                ),
            ])
                .then(([documentScraper, sourceHandler]) => documentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/London (is )?.*/i),
            },
        ]);
    });
});

// TODO: [📓] Maybe test all file in examples (not just 10-simple.docx)
