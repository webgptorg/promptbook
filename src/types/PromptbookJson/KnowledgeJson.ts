import type { JsonFileCommon } from './JsonFileCommon';

/**
 * Knowledge contains information that is used in RAG in promptbooks
 */
export type KnowledgeJson = JsonFileCommon & {
    type: 'KNOWLEDGE';
};
