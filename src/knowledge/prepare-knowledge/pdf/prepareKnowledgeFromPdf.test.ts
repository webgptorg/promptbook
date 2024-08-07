import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../../../llm-providers/_common/getLlmToolsForTestingAndScriptsAndPlayground';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';

describe('how creating knowledge from pdf works', () => {
    // TODO: !! Read here the samples directory (same as prepareKnowledgeFromMarkdown.test.ts)

    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf(await readFile(join(__dirname, 'samples/10-simple.pdf'), 'base64'), {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toMatchObject([]));
});
