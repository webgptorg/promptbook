import { PtbkError } from '../common/errors.js';
import { IpcError, ipcRequest, startIpcServer, type IpcServer } from '../common/ipc.js';
import { isProcessAlive } from '../common/process.js';
import type { Project } from '../project/workspace.js';
import { readProcessRecord, type ProcessRecord } from './records.js';

/**
 * Control methods that only read state (safe to retry).
 *
 * @private service control
 */
export const READ_ONLY_METHODS = new Set(['identify', 'snapshot', 'summary', 'watch', 'requests', 'devices', 'chat-list', 'chat-agents', 'chat-get']);

/**
 * Handler of control methods.
 *
 * @private service control
 */
export type ControlHandler = (method: string, params: Readonly<Record<string, unknown>>) => Promise<unknown>;

/**
 * Starts the control server of a running process.
 *
 * @private service control
 */
export async function startControlServer(address: string, token: string, handler: ControlHandler): Promise<IpcServer> {
    return await startIpcServer(address, async (request) => {
        const message = request as { token?: string; method?: string; params?: Record<string, unknown> };
        if (message.token !== token) throw new Error('Unauthorized control request.');
        if (typeof message.method !== 'string') throw new Error('Missing control method.');
        return await handler(message.method, message.params ?? {});
    });
}

/**
 * Observed state of the project's service.
 *
 * @private service control
 */
export type ServiceLookup =
    | { readonly state: 'running'; readonly record: ProcessRecord; readonly client: ControlClient }
    | { readonly state: 'stopped'; readonly stale?: ProcessRecord }
    | { readonly state: 'unreachable'; readonly record: ProcessRecord; readonly reason: string };

/**
 * Authenticated client of one verified service instance.
 *
 * @private service control
 */
export class ControlClient {
    public constructor(
        private readonly project: Project,
        public readonly record: ProcessRecord,
    ) {}

    /**
     * Sends a control request. Read-only requests retry briefly (re-authenticating the current record); a lost
     * reply to a mutating request is reported as unconfirmed and never replayed.
     */
    public async request<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30_000): Promise<T> {
        const readOnly = READ_ONLY_METHODS.has(method);
        let record = this.record;
        for (let attempt = 1; ; attempt++) {
            try {
                return await ipcRequest<T>(record.controlAddress, { token: record.token, method, params }, timeoutMs);
            } catch (error) {
                if (!(error instanceof IpcError)) throw error;
                if (error.stage === 'remote') {
                    const details = error.details as { kind?: string; reason?: string; effect?: string; next?: string[]; data?: Record<string, unknown> } | undefined;
                    throw new PtbkError(error.message, { kind: (details?.kind as never) ?? 'technical', reason: details?.reason, effect: details?.effect, next: details?.next, data: details?.data });
                }
                if (!readOnly) {
                    throw new PtbkError(error.stage === 'connect' ? 'The service did not accept the request.' : `The outcome of "${method}" is unconfirmed.`, {
                        kind: 'technical',
                        project: this.project.root,
                        reason: error.message,
                        effect: error.stage === 'connect' ? 'Nothing was changed.' : 'The request may or may not have been applied; it was not repeated.',
                        next: ['Run `ptbk status` to see the current state.'],
                    });
                }
                if (attempt >= 3) {
                    throw new PtbkError('The service is not reachable.', { kind: 'technical', project: this.project.root, reason: error.message, next: ['Run `ptbk status` again, or `ptbk restart`.'] });
                }
                await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
                const fresh = await readProcessRecord(this.project);
                if (!fresh || fresh.instanceId !== this.record.instanceId) {
                    throw new PtbkError('The service was replaced or stopped while reading it.', { kind: 'technical', project: this.project.root, next: ['Run the command again.'] });
                }
                record = fresh;
            }
        }
    }
}

/**
 * Locates and verifies the project's service through its process record and control identity.
 *
 * A stale record never controls an unrelated process.
 *
 * @private service control
 */
export async function lookupService(project: Project): Promise<ServiceLookup> {
    const record = await readProcessRecord(project);
    if (!record) return { state: 'stopped' };
    if (!isProcessAlive(record.pid)) return { state: 'stopped', stale: record };
    try {
        const identity = await ipcRequest<{ instanceId: string; projectRoot: string }>(record.controlAddress, { token: record.token, method: 'identify', params: {} }, 5000);
        if (identity.instanceId !== record.instanceId) return { state: 'unreachable', record, reason: 'The control endpoint belongs to a different instance.' };
        return { state: 'running', record, client: new ControlClient(project, record) };
    } catch (error) {
        return { state: 'unreachable', record, reason: error instanceof Error ? error.message : String(error) };
    }
}
