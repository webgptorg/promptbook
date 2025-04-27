import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';

/**
 *
 * @param knowledgePieces
 * @returns
 *
 * @private internal utility of `createPipelineExecutor`
 */
export function knowledgePiecesToString(
    knowledgePieces: ReadonlyArray<Pick<KnowledgePiecePreparedJson, 'content'>>,
): string {
    return knowledgePieces
        .map((knowledgePiece) => {
            const { content } = knowledgePiece;
            return `- ${content}`;
        })
        .join('\n');
    // <- TODO: [🧠] Some smarter aggregation of knowledge pieces, single-line vs multi-line vs mixed
}
