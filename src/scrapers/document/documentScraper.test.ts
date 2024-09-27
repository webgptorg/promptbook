import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { documentScraper } from './documentScraper';

describe('how creating knowledge from docx works', () => {
    it('should scrape simple information from a .docx file', async () =>
        expect(
            documentScraper.scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.docx')), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                filesystemTools: null,
                externalProgramsPaths: {
                    // TODO: !!!!!! use `locate-app` library here
                    pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                },
            }),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should scrape simple information from a .odt file', async () =>
        expect(
            documentScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.odt')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    filesystemTools: null,
                    externalProgramsPaths: {
                        // TODO: !!!!!! use `locate-app` library here
                        pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                    },
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Springfield (is )?.*/i),
            },
        ]));

    it('should NOT scrape irrelevant information', async () =>
        expect(
            documentScraper
                .scrape(emulateScraperSourceOptions(join(__dirname, 'samples/10-simple.docx')), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    filesystemTools: null,
                    externalProgramsPaths: {
                        // TODO: !!!!!! use `locate-app` library here
                        pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
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
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.docx)
 */
