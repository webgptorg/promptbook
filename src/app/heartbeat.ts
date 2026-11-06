import { statfs } from 'node:fs/promises';
import { cpus, freemem, loadavg, totalmem } from 'node:os';
import { encodeBase64Url } from './encoding.js';
import { readPrivateFile, writePrivateFile } from './files.js';
import type { EngineIdentity } from './identity.js';
import { ConnectFailure, httpsRequest, type TestTlsOptions } from './net.js';
import { SIGNING_CONTEXT, sha256Bytes, signingInput } from './signing.js';

/**
 * Seconds between heartbeats (the platform's production cadence).
 *
 * @private App connection
 */
export const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Header carrying the heartbeat signature.
 *
 * @private App connection
 */
export const HEARTBEAT_SIGNATURE_HEADER = 'Ptbk-Signature';

/**
 * Largest heartbeat body.
 */
const HEARTBEAT_MAX_BODY_BYTES = 4096;

/**
 * Largest counted value.
 */
const MAX_HEARTBEAT_COUNT = 1_000_000;

/**
 * File of the persisted heartbeat sequence.
 */
const SEQUENCE_FILE = 'heartbeat-seq.json';

/**
 * The engine-update states a heartbeat reports.
 *
 * @private App connection
 */
export type HeartbeatUpdateState = 'none' | 'available' | 'pending' | 'installing';

/**
 * The values of one heartbeat (`Heartbeat` v1 of the platform); percentages are rounded by `buildHeartbeat`.
 *
 * @private App connection
 */
export type HeartbeatInput = {
    readonly engineId: string;
    readonly seq: number;
    readonly ts: string;
    readonly version: string;
    readonly uptimeS: number;
    readonly diskPct: number;
    readonly ramPct: number;
    readonly cpuLoad: 'low' | 'medium' | 'high';
    readonly update: HeartbeatUpdateState;
    readonly agents: number;
    readonly members: number;
};

/**
 * Rounds a percentage to the nearest ten, halves up; anything outside 0–100 is a bug.
 */
function roundPercent(value: number): number {
    if (!(value >= 0 && value <= 100)) throw new RangeError('A percentage must be between 0 and 100.');
    return Math.round(value / 10) * 10;
}

/**
 * Clamps a count into the schema's range.
 */
function count(value: number): number {
    return Math.min(MAX_HEARTBEAT_COUNT, Math.max(0, Math.floor(value)));
}

/**
 * The exact bytes to send and sign: numbers and closed enums only, fields in the schema's order.
 *
 * @private App connection
 */
export function buildHeartbeat(input: HeartbeatInput): Uint8Array {
    const body = JSON.stringify({
        v: 1,
        engineId: input.engineId,
        seq: input.seq,
        ts: input.ts,
        version: input.version,
        uptimeS: Math.max(0, Math.floor(input.uptimeS)),
        diskPct: roundPercent(input.diskPct),
        ramPct: roundPercent(input.ramPct),
        cpuLoad: input.cpuLoad,
        update: input.update,
        agents: count(input.agents),
        members: count(input.members),
    });
    const bytes = new TextEncoder().encode(body);
    if (bytes.length > HEARTBEAT_MAX_BODY_BYTES) throw new RangeError('The heartbeat body exceeds its size limit.');
    return bytes;
}

/**
 * The `Ptbk-Signature` value, `ed25519=<base64url>`, over `ptbk-heartbeat-v1` and the raw SHA-256 of the body.
 *
 * @private App connection
 */
export async function signHeartbeat(identity: EngineIdentity, body: Uint8Array): Promise<string> {
    return `ed25519=${encodeBase64Url(await identity.signer.sign(signingInput(SIGNING_CONTEXT.heartbeat, sha256Bytes(body))))}`;
}

/**
 * Persists and returns the next sequence number, `max(last + 1, now in ms)`, before anything is sent, so a crash never
 * reuses a value.
 *
 * @private App connection
 */
export async function nextHeartbeatSeq(directory: string, now = Date.now()): Promise<number> {
    let last = -1;
    try {
        const stored = JSON.parse((await readPrivateFile(directory, SEQUENCE_FILE)) ?? '{}') as { seq?: unknown };
        if (typeof stored.seq === 'number' && Number.isSafeInteger(stored.seq)) last = stored.seq;
    } catch {
        // An unreadable sequence restarts from the clock, which is always ahead of any earlier value.
    }
    const seq = Math.max(last + 1, now);
    await writePrivateFile(directory, SEQUENCE_FILE, `${JSON.stringify({ seq })}\n`);
    return seq;
}

/**
 * Host figures for the heartbeat: disk use of the filesystem holding the App data, memory use and a CPU load class.
 *
 * @private App connection
 */
export async function hostFigures(directory: string): Promise<{ diskPct: number; ramPct: number; cpuLoad: 'low' | 'medium' | 'high' }> {
    let diskPct = 0;
    try {
        const stats = await statfs(directory);
        if (stats.blocks > 0) diskPct = Math.min(100, Math.max(0, ((stats.blocks - stats.bavail) / stats.blocks) * 100));
    } catch {
        diskPct = 0;
    }
    const total = totalmem();
    const ramPct = total > 0 ? Math.min(100, Math.max(0, (1 - freemem() / total) * 100)) : 0;
    const perCore = loadavg()[0]! / Math.max(1, cpus().length);
    return { diskPct, ramPct, cpuLoad: perCore < 0.5 ? 'low' : perCore < 0.9 ? 'medium' : 'high' };
}

/**
 * What one heartbeat came to.
 *
 * @private App connection
 */
export type HeartbeatResult = {
    readonly at: string;
    readonly outcome: 'accepted' | 'refused' | 'failed';
    readonly status?: number;
    readonly code?: string;
    /** Local clock minus the dashboard's, when the dashboard reported a stale timestamp. */
    readonly skewMs?: number;
    /** The exact body sent (numbers only), so the owner sees everything the App learns. */
    readonly body: string;
    readonly message?: string;
};

/**
 * Sends one heartbeat directly to the dashboard API. A failure is reported, never retried here.
 *
 * @private App connection
 */
export async function sendHeartbeat(input: {
    readonly identity: EngineIdentity;
    readonly dashboardUrl: string;
    readonly body: Uint8Array;
    readonly env: NodeJS.ProcessEnv;
    readonly tls?: TestTlsOptions;
}): Promise<HeartbeatResult> {
    const at = new Date().toISOString();
    const text = new TextDecoder().decode(input.body);
    try {
        const response = await httpsRequest({
            url: `${input.dashboardUrl}/v1/engines/${input.identity.engineId}/heartbeat`,
            method: 'POST',
            headers: { 'content-type': 'application/json', [HEARTBEAT_SIGNATURE_HEADER.toLowerCase()]: await signHeartbeat(input.identity, input.body) },
            body: input.body,
            maxResponseBytes: 72 * 1024,
            timeoutMs: 20_000,
            env: input.env,
            tls: input.tls,
        });
        if (response.status >= 200 && response.status < 300) return { at, outcome: 'accepted', status: response.status, body: text };
        let code: string | undefined;
        let skewMs: number | undefined;
        try {
            const problem = JSON.parse(response.body.toString('utf8')) as { code?: unknown; serverTime?: unknown };
            if (typeof problem.code === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(problem.code)) code = problem.code;
            if (typeof problem.serverTime === 'string' && Number.isFinite(Date.parse(problem.serverTime))) skewMs = Date.parse(at) - Date.parse(problem.serverTime);
        } catch {
            // A problem body is optional; the status alone is reported.
        }
        return { at, outcome: 'refused', status: response.status, ...(code ? { code } : {}), ...(skewMs !== undefined ? { skewMs } : {}), body: text };
    } catch (error) {
        return { at, outcome: 'failed', body: text, message: error instanceof ConnectFailure ? error.message : 'The heartbeat could not be sent.' };
    }
}
