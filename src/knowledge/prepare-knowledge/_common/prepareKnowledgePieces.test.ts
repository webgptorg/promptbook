import { describe, expect, it } from '@jest/globals';
import { prepareKnowledgePieces } from './prepareKnowledgePieces';
import { getLlmToolsForTests } from './utils/getLlmToolsForTests';

describe('how prepareKnowledge works', () => {
    it('should work with empty knowledge', () =>
        expect(
            prepareKnowledgePieces([], {
                llmTools: getLlmToolsForTests(),
            }),
        ).resolves.toBe([]));

    // TODO: !!!! Test preservation of name from unprepared knowledge
    // TODO: !!!! Test markdown, file and website here, rest in their own preparers
});
