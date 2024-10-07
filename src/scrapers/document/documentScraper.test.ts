import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { documentScraper } from './documentScraper';

describe('how creating knowledge from docx works', () => {
    it('should scrape simple information from a .docx file', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler({
                        sourceContent: join(__dirname, 'samples/10-simple.docx'),
                    }),
                )
                .then((options) =>
                    documentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname: join(__dirname, 'samples'),
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                        },
                    }),
                )
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
                    makeKnowledgeSourceHandler({
                        sourceContent: join(__dirname, 'samples/10-simple.odt'),
                    }),
                )
                .then((options) =>
                    documentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname: join(__dirname, 'samples'),
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                        },
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
                    makeKnowledgeSourceHandler({
                        sourceContent: join(__dirname, 'samples/10-simple.docx'),
                    }),
                )
                .then((options) =>
                    documentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname: join(__dirname, 'samples'),
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                        },
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
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.docx)
 */
