/**
 * One source excerpt returned from the local LlamaIndex knowledge index.
 */
export type KnowledgeSearchResult = {
    /**
     * Citation id referenced from assistant answers, for example `0:0`.
     */
    readonly id: string;

    /**
     * Human-readable source label rendered in source chips.
     */
    readonly source: string;

    /**
     * Optional URL backing the source.
     */
    readonly url?: string;

    /**
     * Retrieved source excerpt.
     */
    readonly excerpt: string;

    /**
     * Similarity score returned by LlamaIndex.
     */
    readonly score?: number;

    /**
     * Inline citation marker the model can copy into its answer.
     */
    readonly citation: string;
};

/**
 * Structured payload persisted as the result of the `knowledge_search` tool.
 */
export type KnowledgeSearchToolResult =
    | {
          readonly status: 'ready';
          readonly query: string;
          readonly indexHash: string;
          readonly results: ReadonlyArray<KnowledgeSearchResult>;
      }
    | {
          readonly status: 'indexing' | 'empty' | 'error';
          readonly query: string;
          readonly results: ReadonlyArray<KnowledgeSearchResult>;
          readonly message: string;
          readonly indexHash?: string;
      };
