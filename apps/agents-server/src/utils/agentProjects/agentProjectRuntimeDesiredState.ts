import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { isSameAgentProjectIdentity, type AgentProjectIdentity } from './agentProjectIdentity';
import { resolveAgentProjectRuntimeDesiredStateFilePath } from './agentProjectRuntimePaths';
import { runAgentProjectStateMutation } from './agentProjectStateMutationQueue';

/**
 * States one agent project can be asked to be in.
 */
export const AGENT_PROJECT_RUNTIME_DESIRED_STATES = ['running', 'stopped'] as const;

/**
 * State one agent project is expected to be in until somebody decides otherwise.
 */
export type AgentProjectRuntimeDesiredState = (typeof AGENT_PROJECT_RUNTIME_DESIRED_STATES)[number];

/**
 * State of every project which was never explicitly stopped.
 *
 * A project exists to be reachable, so being started is its default — only an explicit stop
 * keeps it down across server restarts.
 */
export const DEFAULT_AGENT_PROJECT_RUNTIME_DESIRED_STATE: AgentProjectRuntimeDesiredState = 'running';

/**
 * Global key used to serialize desired-state mutations across concurrent requests.
 */
const AGENT_PROJECT_RUNTIME_DESIRED_STATE_GLOBAL_KEY = '__PROMPTBOOK_AGENT_PROJECT_RUNTIME_DESIRED_STATE__';

/**
 * Current persisted desired-state schema version.
 */
const AGENT_PROJECT_RUNTIME_DESIRED_STATE_VERSION = 1;

/**
 * Persisted decision to run or not to run one agent project.
 */
export type AgentProjectRuntimeDesiredStateRecord = AgentProjectIdentity & {
    /**
     * State the project should be in.
     */
    readonly desiredState: AgentProjectRuntimeDesiredState;

    /**
     * ISO timestamp when this decision was made.
     */
    readonly updatedAt: string;
};

/**
 * Persisted desired-state document shape.
 */
type PersistedAgentProjectRuntimeDesiredStates = {
    readonly version: number;
    readonly projects: ReadonlyArray<AgentProjectRuntimeDesiredStateRecord>;
};

/**
 * Lists every explicit decision to run or not to run a project.
 *
 * Projects nobody ever started or stopped are absent from the list — they run by default.
 *
 * @returns Persisted desired-state records.
 */
export async function listAgentProjectRuntimeDesiredStates(): Promise<
    ReadonlyArray<AgentProjectRuntimeDesiredStateRecord>
> {
    const desiredStateFilePath = resolveAgentProjectRuntimeDesiredStateFilePath();
    let rawContent: string;

    try {
        rawContent = await readFile(desiredStateFilePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }

        throw new UnexpectedError(
            spaceTrim(`
                Failed to read agent project desired states.

                **Desired state file:** \`${desiredStateFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }

    try {
        return parsePersistedAgentProjectRuntimeDesiredStates(JSON.parse(rawContent));
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to parse agent project desired states.

                **Desired state file:** \`${desiredStateFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Resolves the desired state of one project from already-loaded records.
 *
 * This is the one place deciding what "no record at all" means, so a caller which reads every
 * record once — such as the automatic project start — answers the same question the same way.
 *
 * @param desiredStateRecords - Persisted desired-state records.
 * @param identity - Agent and project identification.
 * @returns State the project should be in.
 */
export function resolveAgentProjectRuntimeDesiredStateFromRecords(
    desiredStateRecords: ReadonlyArray<AgentProjectRuntimeDesiredStateRecord>,
    identity: AgentProjectIdentity,
): AgentProjectRuntimeDesiredState {
    const desiredStateRecord = desiredStateRecords.find((record) => isSameAgentProjectIdentity(record, identity));

    return desiredStateRecord?.desiredState ?? DEFAULT_AGENT_PROJECT_RUNTIME_DESIRED_STATE;
}

/**
 * Resolves the desired state of one single project.
 *
 * @param identity - Agent and project identification.
 * @returns State the project should be in.
 */
export async function resolveAgentProjectRuntimeDesiredState(
    identity: AgentProjectIdentity,
): Promise<AgentProjectRuntimeDesiredState> {
    return resolveAgentProjectRuntimeDesiredStateFromRecords(await listAgentProjectRuntimeDesiredStates(), identity);
}

/**
 * Remembers that one project should be running or should stay stopped.
 *
 * Nothing is written when the project is already expected to be in the requested state, so a
 * project which simply runs by default never grows a record of its own.
 *
 * @param options - Agent and project identification together with the requested state.
 */
export async function setAgentProjectRuntimeDesiredState(
    options: AgentProjectIdentity & {
        /**
         * State the project should be in from now on.
         */
        readonly desiredState: AgentProjectRuntimeDesiredState;
    },
): Promise<void> {
    await runAgentProjectStateMutation(AGENT_PROJECT_RUNTIME_DESIRED_STATE_GLOBAL_KEY, async () => {
        const desiredStateRecords = await listAgentProjectRuntimeDesiredStates();

        if (resolveAgentProjectRuntimeDesiredStateFromRecords(desiredStateRecords, options) === options.desiredState) {
            return;
        }

        const changedRecord: AgentProjectRuntimeDesiredStateRecord = {
            agentPermanentId: options.agentPermanentId,
            projectName: options.projectName,
            desiredState: options.desiredState,
            updatedAt: new Date().toISOString(),
        };

        await writeAgentProjectRuntimeDesiredStates([
            ...desiredStateRecords.filter((record) => !isSameAgentProjectIdentity(record, options)),
            changedRecord,
        ]);
    });
}

/**
 * Persists all desired-state records.
 *
 * @param desiredStateRecords - Records to persist.
 */
async function writeAgentProjectRuntimeDesiredStates(
    desiredStateRecords: ReadonlyArray<AgentProjectRuntimeDesiredStateRecord>,
): Promise<void> {
    const desiredStateFilePath = resolveAgentProjectRuntimeDesiredStateFilePath();
    const payload: PersistedAgentProjectRuntimeDesiredStates = {
        version: AGENT_PROJECT_RUNTIME_DESIRED_STATE_VERSION,
        projects: [...desiredStateRecords].sort((firstRecord, secondRecord) =>
            `${firstRecord.agentPermanentId}/${firstRecord.projectName}`.localeCompare(
                `${secondRecord.agentPermanentId}/${secondRecord.projectName}`,
            ),
        ),
    };

    try {
        await mkdir(dirname(desiredStateFilePath), { recursive: true });
        await writeFile(desiredStateFilePath, `${JSON.stringify(payload, null, 4)}\n`, 'utf-8');
    } catch (error) {
        throw new UnexpectedError(
            spaceTrim(`
                Failed to persist agent project desired states.

                **Desired state file:** \`${desiredStateFilePath}\`
                **Cause:** \`${error instanceof Error ? error.message : String(error)}\`
            `),
        );
    }
}

/**
 * Parses persisted desired-state records and ignores invalid rows.
 */
function parsePersistedAgentProjectRuntimeDesiredStates(
    rawValue: unknown,
): ReadonlyArray<AgentProjectRuntimeDesiredStateRecord> {
    if (!rawValue || typeof rawValue !== 'object') {
        return [];
    }

    const desiredStates = rawValue as Partial<PersistedAgentProjectRuntimeDesiredStates>;

    if (!Array.isArray(desiredStates.projects)) {
        return [];
    }

    return desiredStates.projects
        .map((rawRecord): AgentProjectRuntimeDesiredStateRecord | null => {
            if (!rawRecord || typeof rawRecord !== 'object') {
                return null;
            }

            const record = rawRecord as Partial<AgentProjectRuntimeDesiredStateRecord>;

            if (
                typeof record.agentPermanentId !== 'string' ||
                typeof record.projectName !== 'string' ||
                !isAgentProjectRuntimeDesiredState(record.desiredState)
            ) {
                return null;
            }

            return {
                agentPermanentId: record.agentPermanentId,
                projectName: record.projectName,
                desiredState: record.desiredState,
                updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
            };
        })
        .filter((record): record is AgentProjectRuntimeDesiredStateRecord => record !== null);
}

/**
 * Checks whether a raw value is a known desired state.
 */
function isAgentProjectRuntimeDesiredState(value: unknown): value is AgentProjectRuntimeDesiredState {
    return AGENT_PROJECT_RUNTIME_DESIRED_STATES.includes(value as AgentProjectRuntimeDesiredState);
}
