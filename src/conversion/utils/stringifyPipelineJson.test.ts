import { describe, expect, it } from '@jest/globals';
import { importPipelineJson, importPipelineJsonAsString } from '../validation/_importPipeline';
import { stringifyPipelineJson } from './stringifyPipelineJson';

describe('how stringifyPipelineJson works', () => {
    it('should work with markdown-knowledge.ptbk.json', () =>
        expect(stringifyPipelineJson(importPipelineJson('26-markdown-knowledge.ptbk.json'))).toBe(
            importPipelineJsonAsString('26-markdown-knowledge.ptbk.json'),
        ));

    // TODO: Better test
});
