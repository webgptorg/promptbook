import type { LlmToolDefinition } from '../../../src/types/LlmToolDefinition';

/** One compiled Book and its callable advisers; loaders belong to this session's Book collection. */
export type CoderTeamAgent = {
    readonly url: string;
    readonly name: string;
    readonly systemMessage: string;
    readonly teammates: ReadonlyArray<CoderTeammate>;
    readonly resolveTeammate: (url: string, signal: AbortSignal) => Promise<CoderTeamAgent>;
};

/** The ordinary Book TEAM definition, paired with its model-facing tool schema. */
export type CoderTeammate = {
    readonly url: string;
    readonly label: string;
    readonly instructions?: string;
    readonly tool: LlmToolDefinition;
};

// Note: [💞] Related TEAM contract types share a file.
