import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getLlmToolsForTestingAndScriptsAndPlayground } from '../_common/utils/getLlmToolsForTestingAndScriptsAndPlayground';
import { prepareKnowledgeFromMarkdown } from './prepareKnowledgeFromMarkdown';

describe('how creating knowledge from markdown works', () => {
    const simpleSampleMarkdown = readFileSync(
        join(__dirname, 'samples/10-simple.md'),
        'utf-8',
    ); /* <- Note: Its OK to use sync in tooling */

    console.log('!!! process.env', process.env);

    it('should work with simple piece of information', async () =>
        expect(
            prepareKnowledgeFromMarkdown(simpleSampleMarkdown, {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toMatchObject([
            // TODO: !!!! Test this with real cached implementation
        ]));
});

/**
 * TODO: [📓] Maybe test all file in samples (not just 10-simple.md)
 */
