import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { legacyDocumentScraper } from './legacyDocumentScraper';

describe('how creating knowledge from docx works', () => {
    it('should scrape simple information from a (legacy) .doc file', () =>
        expect(
            legacyDocumentScraper.scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.doc')), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                rootDirname: join(__dirname, 'samples'),
                externalProgramsPaths: {
                    // TODO: !!!!!! use `locate-app` library here
                    pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                    libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
                },
            }),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should scrape simple information from a .rtf file', () =>
        expect(
            legacyDocumentScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.rtf')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    rootDirname: join(__dirname, 'samples'),
                    externalProgramsPaths: {
                        // TODO: !!!!!! use `locate-app` library here
                        pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                        libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
                    },
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            legacyDocumentScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.doc')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    rootDirname: join(__dirname, 'samples'),
                    externalProgramsPaths: {
                        // TODO: !!!!!! use `locate-app` library here
                        pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                        libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
                    },
                })
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
