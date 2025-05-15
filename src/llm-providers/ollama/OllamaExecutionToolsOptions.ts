export interface OllamaExecutionToolsOptions {
    /** Base URL of Ollama API, e.g., http://localhost:11434 */
    baseUrl: string;
  // <- TODO: !!!! default


    /** Model name to use for requests */
    model: string;
    /** Optional rate limit: max requests per minute */
    maxRequestsPerMinute?: number;
    /** Verbose logging */
    isVerbose?: boolean;
    /** Optional user identifier */
    userId?: string;
}

/*
!!!
*/
