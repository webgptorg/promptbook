import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { $provideExecutablesForNode } from '../../executables/$provideExecutablesForNode';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { DocumentScraper } from './DocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'examples');

    const documentScraperPromise = (async () =>
        new DocumentScraper(
            {
                fs: $provideFilesystemForNode(),
                llm: $provideLlmToolsForTestingAndScriptsAndPlayground(),
                executables: await $provideExecutablesForNode(),
            },
            {
                rootDirname,
            },
        ))();

    it('should scrape simple information from a .docx file', () =>
        expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.docx',
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
        ]));

    it('should scrape simple information from a .odt file', () =>
        expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.odt',
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
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            Promise.all([
                documentScraperPromise,
                makeKnowledgeSourceHandler(
                    {
                        sourceContent: '10-simple.docx',
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
        ]));
});

/**
 * TODO: [📓] Maybe test all file in examples (not just 10-simple.docx)
 */
