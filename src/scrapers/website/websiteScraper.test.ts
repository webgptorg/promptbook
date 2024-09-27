import { describe, expect, it } from '@jest/globals';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { emulateScraperSourceOptions } from '../_common/utils/emulateScraperSourceOptions';
import { websiteScraper } from './websiteScraper';

describe('how creating knowledge from website works', () => {
    it('should scrape simple information from a https://www.pavolhejny.com/', async () =>
        expect(
            websiteScraper.scrape(emulateScraperSourceOptions('https://www.pavolhejny.com/'), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                filesystemTools: null,
            }),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/Pavol Hejný .*/i),
            },
        ]));

    it('should NOT scrape irrelevant information', async () =>
        expect(
            websiteScraper.scrape(emulateScraperSourceOptions('https://www.pavolhejny.com/'), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                filesystemTools: null,
            }),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/Jiří Jahn .*/i),
            },
        ]));
});
