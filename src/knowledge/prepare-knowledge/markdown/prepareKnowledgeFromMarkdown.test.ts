import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../_common/utils/getLlmToolsForTestingAndScriptsAndPlayground';
import { prepareKnowledgeFromMarkdown } from './prepareKnowledgeFromMarkdown';

describe('how creating knowledge from markdown works', () => {
    // TODO: !!!! Read here the samples directory
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromMarkdown(
                spaceTrim(`
                    Springfield is a city in the U.S. state of Illinois. It is the county seat of Sangamon County.
                    The city's population of 10566 as of 2019 makes it the sixth most populous city in the state.
                `),
                {
                    llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
                },
            ),
        ).resolves.toMatchObject([
            // TODO: !!!! Test this with real cached implementation
            {},
        ]));
});
