import { describe, expect, it } from '@jest/globals';
import { prepareKnowledgePiece } from './prepareKnowledgePiece';
import { getLlmToolsForTests } from './utils/getLlmToolsForTests';

describe('how prepareKnowledgePiece works', () => {
    it('should work with simple persona description', () =>
        expect(
            prepareKnowledgePiece({
                knowledgePiece: {},
                llmTools: getLlmToolsForTests(),
            }),
        ).resolves.toBe({}));

    // TODO: !!!! Test preservation of name from unprepared knowledge
    // TODO: !!!! Test markdown, file and website here, rest in their own preparers
});
