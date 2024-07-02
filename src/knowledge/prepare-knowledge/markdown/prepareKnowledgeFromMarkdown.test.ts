import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { MockedEchoLlmExecutionTools } from '../../../_packages/fake-llm.index';
import { prepareKnowledgeFromMarkdown } from './prepareKnowledgeFromMarkdown';

describe('how creating knowledge from markdown works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromMarkdown({
                content: spaceTrim(`
                    Springfield is a city in the U.S. state of Illinois. It is the county seat of Sangamon County.
                    The city's population of 10566 as of 2019 makes it the sixth most populous city in the state.
                `),
                llmTools:
                    new MockedEchoLlmExecutionTools(/* TODO: [🧠][🕵️‍♀️] Testing with real LLM with seed and (commited) caching */),
            }),
        ).resolves.toMatchObject([
            {
                /*
                [🕵️‍♀️]
                content: 'L',
                index: [],
                keywords: [],
                name: 'l',
                sources: [],
                title: 'L',
                */
            },
        ]));
});
