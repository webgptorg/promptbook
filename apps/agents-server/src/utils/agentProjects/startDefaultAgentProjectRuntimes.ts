import { createAgentProjectIdentityKey, type AgentProjectIdentity } from './agentProjectIdentity';
import {
    listAgentProjectRuntimeDesiredStates,
    resolveAgentProjectRuntimeDesiredStateFromRecords,
} from './agentProjectRuntimeDesiredState';
import { listAgentProjectDomainRecords } from './agentProjectRuntimeDomains';
import { resolveAgentProjectRuntime, startAgentProjectRuntime } from './agentProjectRuntimeRegistry';
import { listAllLocalAgentProjectIdentities } from './listAllLocalAgentProjectIdentities';

/**
 * Outcome of one pass which brings all projects into their desired state.
 */
export type StartDefaultAgentProjectRuntimesReport = {
    /**
     * Number of projects started by this pass.
     */
    readonly startedProjectCount: number;

    /**
     * Number of projects which were already running or still coming up.
     */
    readonly runningProjectCount: number;

    /**
     * Number of projects left alone because they were explicitly stopped.
     */
    readonly stoppedProjectCount: number;

    /**
     * Number of projects which could not be started.
     */
    readonly failedProjectCount: number;
};

/**
 * Starts every local project which is expected to be running but is not.
 *
 * This is what makes "running" the default state of a project: a project nobody explicitly stopped
 * is started again after the server was restarted, after it crashed, and shortly after it was
 * created. A project which somebody stopped stays stopped until it is started again.
 *
 * Projects are started one after another and one failing project never stops the pass, so a project
 * with a broken dev command cannot keep every other project of the server down.
 *
 * @returns Summary of what the pass did.
 */
export async function startDefaultAgentProjectRuntimes(): Promise<StartDefaultAgentProjectRuntimesReport> {
    const [projectIdentities, desiredStateRecords, projectDomainRecords] = await Promise.all([
        listAllLocalAgentProjectIdentities(),
        listAgentProjectRuntimeDesiredStates(),
        listAgentProjectDomainRecords(),
    ]);
    const serverDomainByProjectKey = new Map(
        projectDomainRecords.map((projectDomainRecord) => [
            createAgentProjectIdentityKey(projectDomainRecord),
            projectDomainRecord.serverDomain,
        ]),
    );

    let startedProjectCount = 0;
    let runningProjectCount = 0;
    let stoppedProjectCount = 0;
    let failedProjectCount = 0;

    for (const projectIdentity of projectIdentities) {
        if (resolveAgentProjectRuntimeDesiredStateFromRecords(desiredStateRecords, projectIdentity) === 'stopped') {
            stoppedProjectCount++;
            continue;
        }

        if (await isAgentProjectRuntimeAlreadyUp(projectIdentity)) {
            runningProjectCount++;
            continue;
        }

        try {
            await startAgentProjectRuntime({
                agentPermanentId: projectIdentity.agentPermanentId,
                projectName: projectIdentity.projectName,
                // Note: Keeps the project on the domain it was already assigned to, which is the only
                //       way to tell servers of one VPS apart outside of a request.
                serverDomain: serverDomainByProjectKey.get(createAgentProjectIdentityKey(projectIdentity)) ?? null,
            });
            startedProjectCount++;
        } catch (error) {
            failedProjectCount++;
            console.error(
                `[agent-project-runtimes] failed to start project \`${projectIdentity.projectName}\` of agent \`${projectIdentity.agentPermanentId}\``,
                error,
            );
        }
    }

    return { startedProjectCount, runningProjectCount, stoppedProjectCount, failedProjectCount };
}

/**
 * Returns whether one project already serves requests or is still coming up.
 *
 * A project which is still starting is left alone so that a slow dev command is not killed and
 * restarted over and over by consecutive passes.
 *
 * @param projectIdentity - Agent and project identification.
 * @returns `true` when the project must not be started again.
 */
async function isAgentProjectRuntimeAlreadyUp(projectIdentity: AgentProjectIdentity): Promise<boolean> {
    const runtime = await resolveAgentProjectRuntime(projectIdentity.agentPermanentId, projectIdentity.projectName);

    return Boolean(runtime && (runtime.isRunning || runtime.status === 'starting'));
}
