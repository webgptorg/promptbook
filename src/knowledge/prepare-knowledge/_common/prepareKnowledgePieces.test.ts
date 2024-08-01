import { describe, expect, it } from '@jest/globals';
import { prepareKnowledgePieces } from './prepareKnowledgePieces';
import { getLlmToolsForTestingAndScriptsAndPlayground } from './utils/getLlmToolsForTestingAndScriptsAndPlayground';

describe('how prepareKnowledge works', () => {
    it('should work with empty knowledge', () =>
        expect(
            prepareKnowledgePieces([], {
                llmTools: getLlmToolsForTestingAndScriptsAndPlayground(),
            }),
        ).resolves.toEqual([]));

    // TODO: [🐝] !!!!! Test markdown, file and website here, rest in their own preparers
});
