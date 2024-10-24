import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { $provideFilesystemForNode } from '../_common/register/$provideFilesystemForNode';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { DocumentScraper } from './DocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'samples');
    const documentScraper = new DocumentScraper(
        { fs: $provideFilesystemForNode(), llm: $provideLlmToolsForTestingAndScriptsAndPlayground() },
        {
            rootDirname,
            externalProgramsPaths: {
                // TODO: !!!!!! use `locate-app` library here
                pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
            },
        },
    );

    it('should scrape simple information from a .docx file', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.docx',
                        },
                        { fs: $provideFilesystemForNode() },
                        { rootDirname },
                    ),
                )
                .then((sourceHandler) => documentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should scrape simple information from a .odt file', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.odt',
                        },
                        { fs: $provideFilesystemForNode() },
                        { rootDirname },
                    ),
                )
                .then((sourceHandler) => documentScraper.scrape(sourceHandler))
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
                            sourceContent: '10-simple.docx',
                        },
                        { fs: $provideFilesystemForNode() },
                        { rootDirname },
                    ),
                )
                .then((sourceHandler) => documentScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/London (is )?.*/i),
            },
        ]));
});

/**
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.docx)
 */
