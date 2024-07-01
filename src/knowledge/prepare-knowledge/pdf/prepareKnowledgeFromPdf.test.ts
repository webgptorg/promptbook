import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { MockedFackedLlmExecutionTools } from '../../../llm-providers/mocked/MockedFackedLlmExecutionTools';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';

describe('how creating knowledge from pdf works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf({
                content: spaceTrim(`
                    TODO: !!! Emulate somehow the content of a markdown file
                `),
                llmTools: new MockedFackedLlmExecutionTools(),
            }),
        ).resolves.toEqual([
            // !!!! Implement this
        ]));
});
