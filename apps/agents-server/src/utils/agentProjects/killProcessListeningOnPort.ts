import { execFile } from 'child_process';
import { promisify } from 'util';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';

/**
 * Timeout for operating-system port owner lookups.
 */
const PORT_PROCESS_LOOKUP_TIMEOUT_MS = 3_000;

/**
 * Promisified `execFile`.
 */
const execFileAsync = promisify(execFile);

/**
 * Result of terminating processes that listen on one TCP port.
 */
export type KillProcessListeningOnPortResult = {
    /**
     * Process ids that were signaled.
     */
    readonly killedProcessIds: ReadonlyArray<number>;
};

/**
 * Terminates processes that currently listen on a local TCP port.
 *
 * This never kills the current Agents Server process. Server-owned static runtimes are
 * closed through their HTTP server handle before this fallback is used.
 *
 * @param port - TCP port to terminate.
 * @returns Terminated process ids.
 */
export async function killProcessListeningOnPort(port: number): Promise<KillProcessListeningOnPortResult> {
    const processIds = await listProcessIdsListeningOnPort(port);
    const killedProcessIds: Array<number> = [];

    for (const processId of processIds) {
        if (processId === process.pid) {
            continue;
        }

        try {
            process.kill(processId);
            killedProcessIds.push(processId);
        } catch (error) {
            if (isMissingProcessError(error)) {
                continue;
            }

            throw new NotAllowed(
                spaceTrim(`
                    Failed to terminate process \`${processId}\` listening on port \`${port}\`.

                    **Error:** ${error instanceof Error ? error.message : String(error)}
                `),
            );
        }
    }

    return { killedProcessIds };
}

/**
 * Lists process ids that currently listen on one TCP port.
 *
 * @param port - TCP port to inspect.
 * @returns Listening process ids, if the current operating system exposes them.
 */
export async function listProcessIdsListeningOnPort(port: number): Promise<ReadonlyArray<number>> {
    if (process.platform === 'win32') {
        return await listWindowsProcessIdsListeningOnPort(port);
    }

    return await listUnixProcessIdsListeningOnPort(port);
}

/**
 * Lists Windows TCP listeners using `netstat`.
 */
async function listWindowsProcessIdsListeningOnPort(port: number): Promise<ReadonlyArray<number>> {
    try {
        const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], {
            timeout: PORT_PROCESS_LOOKUP_TIMEOUT_MS,
        });

        return parseWindowsNetstatProcessIds(stdout, port);
    } catch {
        return [];
    }
}

/**
 * Lists Unix TCP listeners using `lsof`, falling back to `fuser` when available.
 */
async function listUnixProcessIdsListeningOnPort(port: number): Promise<ReadonlyArray<number>> {
    try {
        const { stdout } = await execFileAsync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
            timeout: PORT_PROCESS_LOOKUP_TIMEOUT_MS,
        });

        return parseNumericProcessIdLines(stdout);
    } catch {
        return await listUnixProcessIdsListeningOnPortWithFuser(port);
    }
}

/**
 * Lists Unix TCP listeners using `fuser`.
 */
async function listUnixProcessIdsListeningOnPortWithFuser(port: number): Promise<ReadonlyArray<number>> {
    try {
        const { stdout } = await execFileAsync('fuser', ['-n', 'tcp', String(port)], {
            timeout: PORT_PROCESS_LOOKUP_TIMEOUT_MS,
        });

        return parseNumericProcessIdLines(stdout);
    } catch {
        return [];
    }
}

/**
 * Parses Windows `netstat -ano -p tcp` output for one listening port.
 */
function parseWindowsNetstatProcessIds(output: string, port: number): ReadonlyArray<number> {
    const processIds = new Set<number>();
    const portSuffix = `:${port}`;

    for (const line of output.split(/\r?\n/gu)) {
        const columns = line.trim().split(/\s+/u);
        const [protocol, localAddress, , state, processIdText] = columns;
        const isTcpProtocol = protocol?.toUpperCase() === 'TCP';
        const isListening = state?.toUpperCase() === 'LISTENING';
        const isMatchingPort = Boolean(localAddress?.endsWith(portSuffix));

        if (!isTcpProtocol || !isListening || !isMatchingPort || !processIdText) {
            continue;
        }

        const processId = Number(processIdText);
        if (Number.isInteger(processId) && processId > 0) {
            processIds.add(processId);
        }
    }

    return [...processIds];
}

/**
 * Parses command output containing numeric process ids.
 */
function parseNumericProcessIdLines(output: string): ReadonlyArray<number> {
    return [...new Set(output.split(/\s+/u).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
}

/**
 * Returns whether a process-kill error means the process already exited.
 */
function isMissingProcessError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ESRCH');
}

