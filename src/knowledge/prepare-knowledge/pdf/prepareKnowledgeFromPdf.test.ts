import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';

describe('how creating knowledge from pdf works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf({
                content: await readFile(join(__dirname, 'samples/10-simple.pdf'), 'base64'),
                llmTools:
                    new MockedEchoLlmExecutionTools(/* TODO: [🧠][🕵️‍♀️] Testing with real LLM with seed and (commited) caching */),
            }),
        ).resolves.toMatchObject([
            // TODO: !!!! Test this with real implementation
            {
                /*
                [🕵️‍♀️]
                content: 'M',
                index: [],
                keywords: [],
                name: 'm',
                sources: [],
                title: 'M',
                */
            },
        ]));
});
