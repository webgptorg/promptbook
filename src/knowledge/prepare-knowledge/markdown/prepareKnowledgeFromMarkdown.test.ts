import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { MockedFackedLlmExecutionTools } from '../../../llm-providers/mocked/MockedFackedLlmExecutionTools';
import { prepareKnowledgeFromMarkdown } from './prepareKnowledgeFromMarkdown';

describe('how creating knowledge from markdown works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromMarkdown({
                content: spaceTrim(`
                    Springfield is a city in the U.S. state of Illinois. It is the county seat of Sangamon County.
                    The city's population of 10566 as of 2019 makes it the sixth most populous city in the state.
                `),
                llmTools: new MockedFackedLlmExecutionTools(),
            }),
        ).resolves.toEqual([
            {
                content: 'L',
                index: [],
                keywords: [],
                name: 'l',
                sources: [],
                title: 'L',
            },
        ]));
});
