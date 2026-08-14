/**
 * Synthetic tool name used for agent-project chips in chat UI.
 *
 * The Agents Server emits one such tool call per project an answer viewed or edited, so the chat
 * shows which projects the agent worked with below the message that touched them.
 *
 * @private internal chat-ui marker for touched agent projects
 */
export const AGENT_PROJECT_TOOL_CALL_NAME = 'agent_project_touched';

/**
 * Safe, user-facing metadata shown in agent-project chips.
 *
 * @private internal chat-ui type for touched agent projects
 */
export type AgentProjectToolCallResult = {
    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Human-readable project name shown in the chip.
     */
    readonly displayName?: string;

    /**
     * Link to the project page, when the chat knows where the project lives.
     */
    readonly projectHref?: string;
};

/**
 * Parses the project-chip payload from one tool result.
 *
 * @param result - Raw tool result payload.
 * @returns Parsed project metadata, or `null` when the result describes no project.
 *
 * @private internal helper reused by chip and modal rendering
 */
export function parseAgentProjectToolCallResult(result: unknown): AgentProjectToolCallResult | null {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return null;
    }

    const candidate = result as Partial<AgentProjectToolCallResult>;
    if (typeof candidate.projectName !== 'string' || candidate.projectName.trim().length === 0) {
        return null;
    }

    return {
        projectName: candidate.projectName.trim(),
        ...(typeof candidate.displayName === 'string' && candidate.displayName.trim().length > 0
            ? { displayName: candidate.displayName.trim() }
            : {}),
        ...(typeof candidate.projectHref === 'string' && candidate.projectHref.trim().length > 0
            ? { projectHref: candidate.projectHref.trim() }
            : {}),
    };
}

/**
 * Resolves the chip label of one touched agent project.
 *
 * @param projectResult - Parsed project metadata.
 * @returns Human-readable project name.
 *
 * @private internal helper reused by chip and modal rendering
 */
export function resolveAgentProjectToolCallLabel(projectResult: AgentProjectToolCallResult): string {
    return projectResult.displayName || projectResult.projectName;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
