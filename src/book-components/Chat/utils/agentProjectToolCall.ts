import type { AgentMessageProjectChange } from '../../../utils/agent-message-runtime/AgentMessageProjectChange';
import { normalizeAgentMessageProjectChange } from '../../../utils/agent-message-runtime/AgentMessageProjectChange';

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
 * Everything besides the project name is optional, because a chip written by an older server — or
 * one whose project has meanwhile been deleted — still has to render.
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
     * Short project description, resolved the same way as on the project page.
     */
    readonly description?: string;

    /**
     * Link to the project page, when the chat knows where the project lives.
     */
    readonly projectHref?: string;

    /**
     * Address the running project itself is served on, when it has one.
     */
    readonly projectUrl?: string;

    /**
     * Whether the project was running when the answer finished.
     */
    readonly isRunning?: boolean;

    /**
     * Runtime status label, the same one the project page shows.
     */
    readonly runtimeStatusLabel?: string;

    /**
     * Total size of the project, already formatted for display.
     */
    readonly sizeLabel?: string;

    /**
     * Count of files inside the project.
     */
    readonly fileCount?: number;

    /**
     * Whether the project folder is a git repository.
     */
    readonly isGitRepository?: boolean;

    /**
     * What this very message changed in the project, when it changed anything.
     *
     * Its `projectName` repeats the one above because the change is reported by the agent runner
     * in exactly this shape, and reusing it keeps the two descriptions from drifting apart.
     */
    readonly change?: AgentMessageProjectChange;
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

    const change = normalizeAgentMessageProjectChange(candidate.change);

    return {
        projectName: candidate.projectName.trim(),
        ...pickTrimmedText('displayName', candidate.displayName),
        ...pickTrimmedText('description', candidate.description),
        ...pickTrimmedText('projectHref', candidate.projectHref),
        ...pickTrimmedText('projectUrl', candidate.projectUrl),
        ...pickTrimmedText('runtimeStatusLabel', candidate.runtimeStatusLabel),
        ...pickTrimmedText('sizeLabel', candidate.sizeLabel),
        ...(typeof candidate.isRunning === 'boolean' ? { isRunning: candidate.isRunning } : {}),
        ...(typeof candidate.isGitRepository === 'boolean' ? { isGitRepository: candidate.isGitRepository } : {}),
        ...(typeof candidate.fileCount === 'number' && Number.isFinite(candidate.fileCount) && candidate.fileCount >= 0
            ? { fileCount: candidate.fileCount }
            : {}),
        ...(change ? { change } : {}),
    };
}

/**
 * Keeps one optional text field only when it carries content.
 *
 * @param fieldName - Name of the payload field.
 * @param value - Raw field value.
 * @returns Object holding the trimmed field, or an empty object.
 *
 * @private internal helper of `parseAgentProjectToolCallResult`
 */
function pickTrimmedText<TFieldName extends string>(
    fieldName: TFieldName,
    value: unknown,
): Partial<Record<TFieldName, string>> {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return {};
    }

    return { [fieldName]: value.trim() } as Record<TFieldName, string>;
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
