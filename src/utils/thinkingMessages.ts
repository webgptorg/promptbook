/**
 * Default placeholder variants shown when an agent is still composing a response.
 */
export const DEFAULT_THINKING_MESSAGES = [
    'Thinking...',
    'Searching for information...',
    'Sorting information...',
] as const;

/** @internal */
export type ThinkingMessageVariant = (typeof DEFAULT_THINKING_MESSAGES)[number];
