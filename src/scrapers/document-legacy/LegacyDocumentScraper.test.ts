import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { LegacyDocumentScraper } from './LegacyDocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'samples');
    const legacyDocumentScraperPromise = (async () =>
        new LegacyDocumentScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: $provideLlmToolsForTestingAndScriptsAndPlayground(),
                executables: await $provideExecutablesForNode(),
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a (legacy) .doc file', () =>
        expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.doc',
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
        ]));

    it('should scrape simple information from a .rtf file', () =>
        expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.rtf',
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
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            Promise.all([
                legacyDocumentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.doc',
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
        ]));
});

/**
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.doc)
 */
