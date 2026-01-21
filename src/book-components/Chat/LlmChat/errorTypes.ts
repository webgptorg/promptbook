/**
 * Error types for LlmChat component
 *
 * This is a minimal type definition for use in the Promptbook Engine component.
 * The full implementation is in the Agent Server.
 */

export type FriendlyErrorMessage = {
    title: string;
    message: string;
    canRetry: boolean;
};
