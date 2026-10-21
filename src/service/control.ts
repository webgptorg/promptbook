import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { IpcError, ipcRequest, startIpcServer, type IpcServer } from '../common/ipc.js';
import { isProcessAlive } from '../common/process.js';
import { ENGINE_VERSION } from '../common/version.js';
import type { Project } from '../project/workspace.js';
import { readProcessRecord, type ProcessRecord } from './records.js';

/**
 * Control methods that only read state (safe to retry).
 *
 * @private service control
 */
export const READ_ONLY_METHODS = new Set(['identify', 'snapshot', 'summary', 'watch', 'requests', 'devices', 'chat-list', 'chat-agents', 'chat-get']);

/**
 * Version of the control contract: the shapes of snapshots and control replies that clients render.
 *
 * Engines and clients of different ptbk versions interoperate only when their contracts match. Bump it with every
 * change that a client of the previous contract could misread (a removed, renamed or retyped field or method); a new
 * snapshot field keeps the contract only when it is optional, so clients must handle its absence.
 *
 * @private service control
 */
export const CONTROL_CONTRACT = 3;

/**
 * Control methods whose replies are rendered as a service snapshot; reading them from an engine of another
 * contract would misrender (or crash) the client.
 */
const SNAPSHOT_METHODS = new Set(['snapshot', 'watch']);

/**
 * Identity of the engine behind a control endpoint, as reported by its `identify` method.
 *
 * @private service control
 */
export type EngineIdentity = {
    /** Engine version actually loaded by the service (not this client's version). */
    readonly version: string;
    /** Control contract of the engine (absent for engines that predate it). */
    readonly contract?: number;
    /** Whether this client can read the engine's snapshots. */
    readonly compatible: boolean;
};

/**
 * Whether this client can read snapshots of an engine: the same version, or a matching control contract.
 *
 * @private service control
 */
export function engineIdentityOf(reported: { readonly version?: unknown; readonly contract?: unknown }, record: ProcessRecord): EngineIdentity {
    const version = typeof reported.version === 'string' ? reported.version : record.engineVersion;
    const contract = typeof reported.contract === 'number' ? reported.contract : undefined;
    return { version, contract, compatible: version === ENGINE_VERSION || contract === CONTROL_CONTRACT };
}

/**
 * CLI entry point of the installation that runs a service (it may since have been removed or upgraded).
 *
 * @private service control
 */
export function engineBin(record: ProcessRecord): string {
    return join(record.installation, 'bin', 'ptbk.js');
}

/**
 * Actionable error of a client that cannot read the snapshots of an engine of another version.
 *
 * @private service control
 */
export function incompatibleEngineError(project: Project, record: ProcessRecord, engine: EngineIdentity, options: { readonly installationGone?: boolean } = {}): PtbkError {
    return new PtbkError(`The running service uses ptbk ${engine.version}; this ptbk ${ENGINE_VERSION} cannot read its status.`, {
        kind: 'unsupported',
        project: project.root,
        reason: `The control contract differs (service ${engine.contract ?? 'unknown'}, this client ${CONTROL_CONTRACT})${options.installationGone ? `, and the service's installation at ${record.installation} no longer holds ptbk ${engine.version}` : ''}.`,
        effect: 'Nothing was changed; the service keeps running.',
        next: [
            ...(options.installationGone ? [] : [`Use the service's own installation: \`node "${engineBin(record)}" dashboard\`.`]),
            `Switch the service to ptbk ${ENGINE_VERSION}: \`ptbk stop\`, then \`ptbk start\` (unfinished work keeps its recovery record).`,
            `Or view it with its own version: \`npx ptbk@${engine.version} dashboard\`.`,
        ],
    });
}

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
    | { readonly state: 'running'; readonly record: ProcessRecord; readonly engine: EngineIdentity; readonly client: ControlClient }
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
        /** Verified identity of the engine; snapshots of an incompatible engine are refused instead of misrendered. */
        public readonly engine?: EngineIdentity,
    ) {}

    /**
     * Sends a control request. Read-only requests retry briefly (re-authenticating the current record); a lost
     * reply to a mutating request is reported as unconfirmed and never replayed. A request cancelled through `signal`
     * is not retried.
     */
    public async request<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30_000, signal?: AbortSignal): Promise<T> {
        if (this.engine && !this.engine.compatible && SNAPSHOT_METHODS.has(method)) throw incompatibleEngineError(this.project, this.record, this.engine);
        const readOnly = READ_ONLY_METHODS.has(method);
        let record = this.record;
        for (let attempt = 1; ; attempt++) {
            try {
                return await ipcRequest<T>(record.controlAddress, { token: record.token, method, params }, timeoutMs, signal);
            } catch (error) {
                if (!(error instanceof IpcError) || signal?.aborted) throw error;
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
        const identity = await ipcRequest<{ instanceId: string; projectRoot: string; version?: string; contract?: number }>(record.controlAddress, { token: record.token, method: 'identify', params: {} }, 5000);
        if (identity.instanceId !== record.instanceId) return { state: 'unreachable', record, reason: 'The control endpoint belongs to a different instance.' };
        const engine = engineIdentityOf(identity, record);
        return { state: 'running', record, engine, client: new ControlClient(project, record, engine) };
    } catch (error) {
        return { state: 'unreachable', record, reason: error instanceof Error ? error.message : String(error) };
    }
}
