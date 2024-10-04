import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { websiteScraper } from './websiteScraper';

describe('how creating knowledge from website works', () => {
    it('should scrape simple information from a https://www.pavolhejny.com/', () =>
        expect(
            websiteScraper
                .scrape(emulateScraperSourceOptions('https://www.pavolhejny.com/'), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    rootDirname: join(__dirname, 'samples'),
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/(Generative )?AI/i),
            },
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            websiteScraper
                .scrape(emulateScraperSourceOptions('https://www.pavolhejny.com/'), {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                    rootDirname: join(__dirname, 'samples'),
                })
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/Jiří Jahn .*/i),
            },
        ]));
});
