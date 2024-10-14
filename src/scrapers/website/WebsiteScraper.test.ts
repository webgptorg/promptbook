import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { makeKnowledgeSourceHandler } from '../_common/utils/makeKnowledgeSourceHandler';
import { websiteScraper } from './websiteScraper';

describe('how creating knowledge from website works', () => {
    const rootDirname = join(__dirname, 'samples');
    const markdownScraper = new MarkdownScraper({
      llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
      rootDirname,
  });

    it('should scrape simple information from a https://www.pavolhejny.com/', () =>
        expect(
            Promise.resolve()
                .then(() =>
                    makeKnowledgeSourceHandler({ sourceContent: 'https://www.pavolhejny.com/' }, { rootDirname }),
                )
                .then((options) =>
                    websiteScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname
                    }),
                )
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
                .then((options) =>
                    websiteScraper.scrape(options, {
                        llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                        rootDirname,
                    }),
                )
                .then((knowledge) => knowledge?.map(({ content }) => ({ content })))
                .then((knowledge) => knowledge?.slice(0, 1)),
        ).resolves.toMatchObject([
            {
                content: expect.not.stringMatching(/Jiří Jahn .*/i),
            },
        ]));
});
