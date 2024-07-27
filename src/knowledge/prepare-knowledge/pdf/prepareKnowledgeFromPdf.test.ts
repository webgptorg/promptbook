import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MockedEchoLlmExecutionTools } from '../../../llm-providers/mocked/MockedEchoLlmExecutionTools';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';
import { getLlmToolsForTests } from '../_common/utils/getLlmToolsForTests';

describe('how creating knowledge from pdf works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf({
                content: await readFile(join(__dirname, 'samples/10-simple.pdf'), 'base64'),
                llmTools: getLlmToolsForTests()
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
