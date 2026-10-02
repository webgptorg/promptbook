import { NextResponse } from 'next/server';
import { readConfinedWorkspaceFile } from '../../../../../../scripts/run-codex-prompts/workspace/workspaceAgentFiles';
import { getCurrentUser } from '../../../utils/getCurrentUser';
import {
    isWorkspaceAgentStorage,
    provideWorkspaceAgentCollection,
} from '../../../utils/workspace/workspaceAgentStorage';
import { parsePromptFile } from '../../../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import type { WorkspaceMutationRecord } from '../../../../../../scripts/run-codex-prompts/workspace/WorkspaceState';

/** Returns live project execution state through the existing authenticated app. */
export async function GET() {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Administrator authentication required.' }, { status: 403 });
    if (!isWorkspaceAgentStorage())
        return NextResponse.json({ error: 'This server uses standalone storage.' }, { status: 404 });
    const collection = await provideWorkspaceAgentCollection();
    return NextResponse.json(
        {
            agents: await collection.listWorkspaceAgents(),
            control: collection.state.getControl(),
            jobs: collection.state.listJobs().map(({ source: _source, prompt: _prompt, ...job }) => job),
            mutations: collection.state
                .readValues<WorkspaceMutationRecord>('WorkspaceMutation')
                .map(({ files, ...mutation }) => ({ ...mutation, paths: files.map(({ path }) => path) })),
        },
        { headers: { 'Cache-Control': 'no-store' } },
    );
}

/** Controls the same persisted supervisor state used by the terminal, without accepting arbitrary shell commands. */
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return NextResponse.json({ error: 'Administrator authentication required.' }, { status: 403 });
    if (!isWorkspaceAgentStorage()) return NextResponse.json({ error: 'No workspace supervisor.' }, { status: 404 });
    const payload = (await request.json().catch(() => null)) as { action?: string; jobId?: string } | null;
    const collection = await provideWorkspaceAgentCollection();
    const state = collection.state;
    switch (payload?.action) {
        case 'pause':
            state.updateControl({ isPaused: true });
            break;
        case 'resume':
            state.updateControl({ isPaused: false });
            break;
        case 'stop':
            state.updateControl({ isStopping: true });
            break;
        case 'synchronize':
            state.updateControl({ isSynchronizationRequested: true });
            break;
        case 'recover':
            state.updateControl({ isRecoveryRequested: true });
            break;
        case 'retry': {
            const job = state.listJobs().find((candidate) => candidate.id === payload.jobId);
            if (!job || !['failed', 'recovery'].includes(job.status))
                return NextResponse.json(
                    { error: 'Only reviewed failed/interrupted work can be retried.' },
                    { status: 409 },
                );
            const content =
                (await readConfinedWorkspaceFile(process.env.PTBK_AGENTS_SERVER_WORKSPACE!, job.path, 'prompts')) ?? '';
            const section = parsePromptFile(job.path, content).sections.find(
                (candidate) => candidate.index === job.section,
            );
            if (section?.status !== 'todo')
                return NextResponse.json(
                    {
                        error: 'Review retained changes and explicitly restore the PRD to ready before retrying. Completed work is never rerun for a push failure.',
                    },
                    { status: 409 },
                );
            state.updateJob(job.id, { status: 'ready', reason: 'Explicitly retried after review.' });
            break;
        }
        default:
            return NextResponse.json({ error: 'Unknown supervisor action.' }, { status: 400 });
    }
    return NextResponse.json({ control: state.getControl() });
}
