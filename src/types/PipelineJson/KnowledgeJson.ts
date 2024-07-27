import type { MaterialKnowledgePieceJson } from './MaterialKnowledgePieceJson';

/**
 * External knowledge in the pipeline
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 */
export type KnowledgeJson = Array<MaterialKnowledgePieceJson>;

/**
 * TODO: [🦪] Internal links between (Material)KnowledgePieces withing the KnowledgeJson
 */
