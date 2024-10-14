import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { legacyDocumentScraper } from './legacyDocumentScraper';

describe('how creating knowledge from docx works', () => {
    const rootDirname = join(__dirname, 'samples');
    const markdownScraper = new MarkdownScraper({
      llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
      rootDirname,
  });

    it('should scrape simple information from a (legacy) .doc file', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.doc',
                        },
                        { rootDirname },
                    ),
                )
                .then((options) =>
                    legacyDocumentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                            libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
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

    it('should scrape simple information from a .rtf file', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.rtf',
                        },
                        { rootDirname },
                    ),
                )
                .then((options) =>
                    legacyDocumentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                            libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
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
                    makeKnowledgeSourceHandler(
                        {
                            sourceContent: '10-simple.doc',
                        },
                        { rootDirname },
                    ),
                )
                .then((options) =>
                    legacyDocumentScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                        externalProgramsPaths: {
                            // TODO: !!!!!! use `locate-app` library here
                            pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                            libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
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
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.doc)
 */
