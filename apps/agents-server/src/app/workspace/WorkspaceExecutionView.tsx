'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
    WorkspaceControl,
    WorkspaceJob,
    WorkspaceMutationRecord,
} from '../../../../../scripts/run-codex-prompts/workspace/WorkspaceState';
import type { WorkspaceAgentFile } from '../../../../../scripts/run-codex-prompts/workspace/workspaceAgentFiles';

/** Actual persistent supervisor state; no generated progress or fictitious agent messages. */
type WorkspaceSnapshot = {
    agents: WorkspaceAgentFile[];
    jobs: WorkspaceJob[];
    control: WorkspaceControl;
    mutations: Array<Omit<WorkspaceMutationRecord, 'files'> & { paths: string[] }>;
};

/** Project execution controls and inspection integrated in the Agent Server application. */
export function WorkspaceExecutionView() {
    const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const refresh = useCallback(async () => {
        try {
            const response = await fetch('/api/workspace', { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSnapshot(result);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : String(failure));
        }
    }, []);
    useEffect(() => {
        void refresh();
        const interval = setInterval(() => void refresh(), 2_000);
        return () => clearInterval(interval);
    }, [refresh]);
    /** Issues one authorized supervisor action and reloads its real durable result. */
    const control = async (action: string, jobId?: string): Promise<void> => {
        setError(null);
        const response = await fetch('/api/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, jobId }),
        });
        const result = await response.json();
        if (!response.ok) setError(result.error);
        await refresh();
    };
    return (
        <main className="mx-auto max-w-6xl space-y-6 p-6">
            <h1 className="text-2xl font-semibold">Project execution</h1>
            {error && (
                <p role="alert" className="text-red-700">
                    {error}
                </p>
            )}
            {!snapshot ? (
                <p>Loading project state…</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-3">
                        <button
                            className="rounded border px-4 py-2"
                            onClick={() => void control(snapshot.control.isPaused ? 'resume' : 'pause')}
                        >
                            {snapshot.control.isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button className="rounded border px-4 py-2" onClick={() => void control('stop')}>
                            Stop after current work
                        </button>
                        <button className="rounded border px-4 py-2" onClick={() => void control('synchronize')}>
                            Retry synchronization
                        </button>
                        <button className="rounded border px-4 py-2" onClick={() => void control('recover')}>
                            Recover reviewed saves
                        </button>
                    </div>
                    <p>
                        {snapshot.control.isStopping
                            ? 'Stopping after current work.'
                            : snapshot.control.isPaused
                            ? 'Paused. Current work finishes; no new automatic jobs are claimed.'
                            : 'Automatic processing is active.'}{' '}
                        Repository-writing jobs are serialized; chats have independent sessions.
                    </p>
                    <p>
                        Git: <strong>{snapshot.control.synchronization}</strong> {snapshot.control.reason}
                    </p>
                    <div className="grid gap-4 md:grid-cols-3">
                        {snapshot.agents.map((agent) => (
                            <article key={agent.id} className="rounded border p-4">
                                <a className="font-semibold underline" href={`/agents/${encodeURIComponent(agent.id)}`}>
                                    {agent.name}
                                </a>
                                <p>{agent.path}</p>
                                {agent.error ? (
                                    <p className="text-red-700">Blocked: {agent.error}</p>
                                ) : (
                                    <a className="underline" href={`/agents/${encodeURIComponent(agent.id)}/chat`}>
                                        Chat
                                    </a>
                                )}
                            </article>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    {['PRD', 'Priority', 'Agent / harness / model', 'State', 'Verification / Git'].map(
                                        (label) => (
                                            <th className="border-b p-2" key={label}>
                                                {label}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {snapshot.jobs
                                    .sort(
                                        (left, right) =>
                                            right.priority - left.priority || left.path.localeCompare(right.path),
                                    )
                                    .map((job) => (
                                        <tr key={job.id}>
                                            <td className="border-b p-2">
                                                {job.path} #{job.section + 1}
                                            </td>
                                            <td className="border-b p-2">{job.priority}</td>
                                            <td className="border-b p-2">
                                                {job.agentName ?? 'Unresolved'} / {job.harness ?? 'Unresolved'} /{' '}
                                                {job.model ?? 'Configured model'}
                                            </td>
                                            <td className="border-b p-2">
                                                <strong>{job.status}</strong>
                                                <p>{job.reason}</p>
                                                {['failed', 'recovery'].includes(job.status) && (
                                                    <button
                                                        className="underline"
                                                        onClick={() => void control('retry', job.id)}
                                                    >
                                                        Retry reviewed task
                                                    </button>
                                                )}
                                            </td>
                                            <td className="border-b p-2">
                                                {job.verification}
                                                <p>{job.commit?.slice(0, 12)}</p>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {snapshot.mutations
                        .filter((mutation) => mutation.status !== 'committed')
                        .map((mutation) => (
                            <article key={mutation.id} className="rounded border p-4">
                                <strong>
                                    {mutation.message}: {mutation.status}
                                </strong>
                                <p>{mutation.paths.join(', ')}</p>
                                <p>{mutation.reason}</p>
                            </article>
                        ))}
                </>
            )}
        </main>
    );
}
