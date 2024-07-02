import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MockedFackedLlmExecutionTools } from '../../../llm-providers/mocked/MockedFackedLlmExecutionTools';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';

describe('how creating knowledge from pdf works', () => {
    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf({
                content: await readFile(join(__dirname, 'samples/10-simple.pdf'), 'base64'),
                llmTools: new MockedFackedLlmExecutionTools(),
            }),
        ).resolves.toEqual([
            // !!!! Implement this
        ]));
});
