import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/getLlmToolsForTestingAndScriptsAndPlayground';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { WebsiteScraper } from './WebsiteScraper';

describe('how creating knowledge from website works', () => {
    const rootDirname = join(__dirname, 'samples');
    const websiteScraper = new WebsiteScraper({
        markdownScraper: new MarkdownScraper({
            llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            rootDirname,
        }),
        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
        rootDirname,
        // <- TODO: [🍇]
    });

    it('should scrape simple information from a https://www.pavolhejny.com/', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler({ sourceContent: 'https://www.pavolhejny.com/' }, { rootDirname }),
                )
                .then((sourceHandler) => websiteScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.stringMatching(/(Generative )?AI/i),
            },
        ]));

    it('should NOT scrape irrelevant information', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler({ sourceContent: 'https://www.pavolhejny.com/' }, { rootDirname }),
                )
                .then((sourceHandler) => websiteScraper.scrape(sourceHandler))
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/Jiří Jahn .*/i),
            },
        ]));
});
