import { claimNextQueuedUserChatJob } from '../userChat/claimNextQueuedUserChatJob';
import { runUserChatJob } from '../userChat/runUserChatJob';
import type { DurableUserChatJobWorkerTickResult } from '../userChat/runDurableUserChatJobWorkerTick';
import { provideWorkspaceAgentCollection } from './workspaceAgentStorage';

/** Maximum independent chat turns in the web process; repository-writing Coder jobs have their own serialized queue. */
const MAX_WORKSPACE_CHAT_SESSIONS = 4;
/** One process owns one workspace; shared counters survive separate Next route module caches. */
const WORKSPACE_CHAT_WORKERS = ((
    globalThis as typeof globalThis & {
        __promptbookWorkspaceChatWorkers?: { activeSessions: number };
    }
).__promptbookWorkspaceChatWorkers ??= { activeSessions: 0 });

/** Reuses the existing chat worker without also submitting the same job to the standalone folder pump. */
export async function processWorkspaceUserChatJob(options: {
    readonly preferredJobId?: string;
}): Promise<DurableUserChatJobWorkerTickResult> {
    if ((await provideWorkspaceAgentCollection()).state.getControl().isStopping) return { didMutate: false };
    if (WORKSPACE_CHAT_WORKERS.activeSessions >= MAX_WORKSPACE_CHAT_SESSIONS) return { didMutate: false };
    WORKSPACE_CHAT_WORKERS.activeSessions += 1;
    try {
        const job = await claimNextQueuedUserChatJob(options);
        if (!job) return { didMutate: false };
        await runUserChatJob(job);
        return { didMutate: true };
    } finally {
        WORKSPACE_CHAT_WORKERS.activeSessions -= 1;
    }
}

/** Waits for cancelled durable turns to flush terminal state before the owned web process exits. */
export async function waitForWorkspaceChatWorkers(): Promise<void> {
    const deadline = Date.now() + 7_000;
    while (WORKSPACE_CHAT_WORKERS.activeSessions > 0 && Date.now() < deadline)
        await new Promise<void>((done) => setTimeout(done, 100));
}
