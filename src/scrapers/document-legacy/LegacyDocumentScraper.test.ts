import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { join } from 'path';
import { MockedEchoLlmExecutionTools } from '../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { DocumentScraper } from '../document/DocumentScraper';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { LegacyDocumentScraper } from './LegacyDocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'examples');
    const convertedDocumentFixturePath = join(__dirname, '..', 'markdown', 'examples', '10-simple.md');
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

    /**
     * Keeps unit coverage of the legacy-to-document conversion flow independent from local converters.
     */
    function mockDocumentConversions(): void {
        const convertedDocument = {
            filename: convertedDocumentFixturePath,
            isDestroyed: false,
            destroy: async () => undefined,
        } satisfies ScraperIntermediateSource;

        jest.spyOn(LegacyDocumentScraper.prototype, '$convert').mockResolvedValue(convertedDocument);
        jest.spyOn(DocumentScraper.prototype, '$convert').mockResolvedValue(convertedDocument);
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const legacyDocumentScraperPromise = (async () =>
        new LegacyDocumentScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: llmTools,
                executables: {},
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a (legacy) .doc file', () => {
        mockMarkdownScrapingToReturnConvertedContent();
        mockDocumentConversions();

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
        mockDocumentConversions();

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
        mockDocumentConversions();

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
