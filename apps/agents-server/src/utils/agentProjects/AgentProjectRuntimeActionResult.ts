/**
 * Browser-safe runtime state returned after a project chip action.
 */
export type AgentProjectRuntimeActionResult = {
    /**
     * Whether the project accepts requests after the action completes.
     */
    readonly isRunning: boolean;

    /**
     * Public project URL assigned to the runtime, or `null` when none is available.
     */
    readonly projectUrl: string | null;
};
