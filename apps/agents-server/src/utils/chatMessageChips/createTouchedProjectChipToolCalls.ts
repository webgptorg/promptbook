import type { ToolCall } from '@promptbook-local/types';
import { AGENT_PROJECT_TOOL_CALL_NAME } from '../../../../../src/book-components/Chat/utils/agentProjectToolCall';
import type { AgentMessageProjectChange } from '../../../../../src/utils/agent-message-runtime/AgentMessageProjectChange';
import { isSafeAgentProjectPathSegment } from '../agentProjects/agentProjectsPaths';
import { createTouchedProjectChipResult } from './createTouchedProjectChipResult';

/**
 * Prefix of the idempotency keys identifying touched-project chips.
 */
const TOUCHED_PROJECT_CHIP_IDEMPOTENCY_PREFIX = 'agent-project';

/**
 * Creates the project chips of one answered message.
 *
 * A project is reported by the runner once the answering harness viewed or edited any of its
 * files, and every project the answer really committed something into is included as well — a
 * changed project was obviously worked with, even when nothing in the harness log said so.
 * Projects that no longer exist are skipped.
 *
 * @param options - Owning agent, the project directory names its answer touched and what it changed.
 * @returns Project tool calls shown as chips below the answer.
 */
export async function createTouchedProjectChipToolCalls(options: {
    readonly agentPermanentId: string;
    readonly touchedProjectNames: ReadonlyArray<string>;
    readonly projectChanges: ReadonlyArray<AgentMessageProjectChange>;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): Promise<ReadonlyArray<ToolCall>> {
    const changeByProjectName = new Map(
        options.projectChanges.map((projectChange) => [projectChange.projectName.toLowerCase(), projectChange]),
    );
    const projectChipToolCalls = await Promise.all(
        resolveChippedProjectNames(options.touchedProjectNames, options.projectChanges).map((projectName) =>
            createTouchedProjectChipToolCall({
                agentPermanentId: options.agentPermanentId,
                projectName,
                projectChange: changeByProjectName.get(projectName.toLowerCase()) || null,
                createdAt: options.createdAt,
            }),
        ),
    );

    return projectChipToolCalls.filter((projectChipToolCall): projectChipToolCall is ToolCall =>
        Boolean(projectChipToolCall),
    );
}

/**
 * Resolves which projects deserve a chip, keeping the order in which they were reported.
 *
 * @param touchedProjectNames - Projects the harness log showed as viewed or edited.
 * @param projectChanges - Projects the answer committed something into.
 * @returns Unique, safe project directory names.
 *
 * @private function of `createTouchedProjectChipToolCalls`
 */
function resolveChippedProjectNames(
    touchedProjectNames: ReadonlyArray<string>,
    projectChanges: ReadonlyArray<AgentMessageProjectChange>,
): ReadonlyArray<string> {
    const chippedProjectNames = new Map<string, string>();

    for (const projectName of [
        ...touchedProjectNames,
        ...projectChanges.map((projectChange) => projectChange.projectName),
    ]) {
        if (!isSafeAgentProjectPathSegment(projectName) || chippedProjectNames.has(projectName.toLowerCase())) {
            continue;
        }

        chippedProjectNames.set(projectName.toLowerCase(), projectName);
    }

    return [...chippedProjectNames.values()];
}

/**
 * Creates the chip of one touched project.
 *
 * @param options - Owning agent, one touched project and what the answer changed in it.
 * @returns Project tool call, or `null` when the project no longer exists.
 *
 * @private function of `createTouchedProjectChipToolCalls`
 */
async function createTouchedProjectChipToolCall(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
    readonly projectChange: AgentMessageProjectChange | null;
    readonly createdAt: NonNullable<ToolCall['createdAt']>;
}): Promise<ToolCall | null> {
    const projectChipResult = await createTouchedProjectChipResult({
        agentPermanentId: options.agentPermanentId,
        projectName: options.projectName,
        projectChange: options.projectChange,
    });

    if (!projectChipResult) {
        return null;
    }

    return {
        name: AGENT_PROJECT_TOOL_CALL_NAME,
        arguments: { projectName: projectChipResult.projectName },
        result: projectChipResult,
        state: 'COMPLETE',
        idempotencyKey: `${TOUCHED_PROJECT_CHIP_IDEMPOTENCY_PREFIX}-${projectChipResult.projectName.toLowerCase()}`,
        createdAt: options.createdAt,
    };
}
