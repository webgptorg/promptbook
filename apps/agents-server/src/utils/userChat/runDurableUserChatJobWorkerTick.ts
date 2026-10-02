import { mapRegisteredServerContexts } from '../../tools/mapRegisteredServerContexts';
import { processNextLocalUserChatJob } from '../localChatRunner';
import { recoverExpiredRunningUserChatJobs } from './recoverExpiredRunningUserChatJobs';

/**
 * Outcome of one durable user-chat worker tick.
 *
 * @private function of `userChat`
 */
export type DurableUserChatJobWorkerTickResult = {
    /**
     * Whether the tick changed any durable job state and should trigger a follow-up tick.
     */
    readonly didMutate: boolean;
};

/**
 * Runs one worker tick against the currently resolved server context.
 *
 * @param options - Optional preferred job to prioritize.
 * @returns Whether durable state changed for this server.
 *
 * @private function of `userChat`
 */
async function runDurableUserChatJobWorkerTickForCurrentServer(options: {
    preferredJobId?: string;
}): Promise<DurableUserChatJobWorkerTickResult> {
    await recoverExpiredRunningUserChatJobs();
    const processedJob = await processNextLocalUserChatJob({ preferredJobId: options.preferredJobId });
    return { didMutate: Boolean(processedJob?.didMutate) };
}

/**
 * Runs one durable user-chat worker tick.
 *
 * A preferred job is always scoped to the current request's server, because the immediate
 * post-message trigger already runs in that server's context. A coordinator poll (no preferred
 * job, typically a loopback self-call with no server `host`) instead fans out across **every**
 * registered server on the VPS, so queued and running jobs advance for all servers and not only
 * the first/default one. One failing server never blocks the others.
 *
 * @param options - Optional preferred job to prioritize.
 * @returns Whether any durable state changed and a follow-up tick should be scheduled.
 *
 * @private function of `userChat`
 */
export async function runDurableUserChatJobWorkerTick(
    options: {
        preferredJobId?: string;
    } = {},
): Promise<DurableUserChatJobWorkerTickResult> {
    if (options.preferredJobId) {
        return await runDurableUserChatJobWorkerTickForCurrentServer({ preferredJobId: options.preferredJobId });
    }

    const serverRuns = await mapRegisteredServerContexts(async (server) => {
        try {
            return await runDurableUserChatJobWorkerTickForCurrentServer({});
        } catch (error) {
            console.error('[user-chat-job] worker tick failed for one VPS server', {
                serverName: server?.name ?? null,
                serverDomain: server?.domain ?? null,
                error,
            });
            return { didMutate: false };
        }
    });

    return { didMutate: serverRuns.some((serverRun) => serverRun.value.didMutate) };
}
