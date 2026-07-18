import { Socket } from 'net';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';

/**
 * Maximum time spent probing one local TCP port.
 */
const TCP_PORT_CONNECT_TIMEOUT_MS = 500;

/**
 * Returns whether a local TCP port currently accepts connections.
 *
 * @param port - TCP port to probe.
 * @param host - Host address to probe.
 * @returns `true` when the port is listening.
 */
export async function isTcpPortListening(port: number, host: string = AGENT_PROJECT_RUNTIME_HOST): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
        const socket = new Socket();
        let isSettled = false;

        const settle = (isListening: boolean): void => {
            if (isSettled) {
                return;
            }

            isSettled = true;
            clearTimeout(timeout);
            socket.destroy();
            resolve(isListening);
        };

        const timeout = setTimeout(() => settle(false), TCP_PORT_CONNECT_TIMEOUT_MS);
        socket.once('connect', () => settle(true));
        socket.once('timeout', () => settle(false));
        socket.once('error', () => settle(false));
        socket.connect(port, host);
    });
}

/**
 * Waits until a TCP port starts listening or the timeout elapses.
 *
 * @param options - Port, host, timeout, and polling interval.
 * @returns `true` when the port became available before timeout.
 */
export async function waitForTcpPortListening(options: {
    readonly port: number;
    readonly host?: string;
    readonly timeoutMs: number;
    readonly pollIntervalMs: number;
}): Promise<boolean> {
    const startedAtMs = Date.now();

    while (Date.now() - startedAtMs <= options.timeoutMs) {
        if (await isTcpPortListening(options.port, options.host)) {
            return true;
        }

        await wait(options.pollIntervalMs);
    }

    return false;
}

/**
 * Waits for the given delay.
 *
 * @param delayMs - Delay in milliseconds.
 */
async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

