import type { ToolCall } from '@promptbook-local/types';
import { AGENT_PROJECT_TOOL_CALL_NAME } from '../../../../../src/book-components/Chat/utils/agentProjectToolCall';
import { buildAgentProjectProfileHref } from '../agentProjects/agentProjectHrefs';
import { isSafeAgentProjectPathSegment } from '../agentProjects/agentProjectsPaths';
import { resolveAgentProjectInfo } from '../agentProjects/resolveAgentProjectInfo';

/**
 * Prefix of the idempotency keys identifying touched-project chips.
 */
const TOUCHED_PROJECT_CHIP_IDEMPOTENCY_PREFIX = 'agent-project';

/**
 * Creates the project chips of one answered message.
 *
 * A project is reported by the runner once the answering harness viewed or edited any of its
 * files, and it is resolved here so the chip carries the same human-readable project name and
 * link as every other project surface. Projects that no longer exist are skipped.
 *
 * @param options - Owning agent and the project directory names its answer touched.
 * @returns Project tool calls shown as chips below the answer.
 */
export async function createTouchedProjectChipToolCalls(options: {
    readonly agentPermanentId: string;
    readonly touchedProjectNames: ReadonlyArray<string>;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): Promise<ReadonlyArray<ToolCall>> {
    const projectChipToolCalls = await Promise.all(
        options.touchedProjectNames
            .filter((touchedProjectName) => isSafeAgentProjectPathSegment(touchedProjectName))
            .map((touchedProjectName) =>
                createTouchedProjectChipToolCall({
                    agentPermanentId: options.agentPermanentId,
                    projectName: touchedProjectName,
                    createdAt: options.createdAt,
                }),
            ),
    );

    return projectChipToolCalls.filter((projectChipToolCall): projectChipToolCall is ToolCall =>
        Boolean(projectChipToolCall),
    );
}

/**
 * Creates the chip of one touched project.
 *
 * @param options - Owning agent and one touched project directory name.
 * @returns Project tool call, or `null` when the project no longer exists.
 *
 * @private function of `createTouchedProjectChipToolCalls`
 */
async function createTouchedProjectChipToolCall(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): Promise<ToolCall | null> {
    const project = await resolveAgentProjectInfo(options.agentPermanentId, options.projectName);

    if (!project) {
        return null;
    }

    return {
        name: AGENT_PROJECT_TOOL_CALL_NAME,
        arguments: { projectName: project.projectName },
        result: {
            projectName: project.projectName,
            displayName: project.displayName,
            projectHref: buildAgentProjectProfileHref(options.agentPermanentId, project.projectName),
        },
        state: 'COMPLETE',
        idempotencyKey: `${TOUCHED_PROJECT_CHIP_IDEMPOTENCY_PREFIX}-${project.projectName.toLowerCase()}`,
        createdAt: options.createdAt,
    };
}
