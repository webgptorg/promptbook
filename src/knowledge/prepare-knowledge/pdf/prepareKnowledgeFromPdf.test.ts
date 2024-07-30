import { describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getLlmToolsForTests } from '../_common/utils/getLlmToolsForTests';
import { prepareKnowledgeFromPdf } from './prepareKnowledgeFromPdf';

describe('how creating knowledge from pdf works', () => {
    // TODO: !!!! Read here the samples directory

    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromPdf(await readFile(join(__dirname, 'samples/10-simple.pdf'), 'base64'), {
                llmTools: getLlmToolsForTests(),
            }),
        ).resolves.toMatchObject([
            // TODO: !!!! Test this with real cached implementation
            {
             
            },
        ]));
});
