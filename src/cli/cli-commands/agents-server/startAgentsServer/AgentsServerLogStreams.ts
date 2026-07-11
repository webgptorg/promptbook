import { createWriteStream, type WriteStream } from 'fs';
import type { AgentsServerRuntimePaths } from './AgentsServerRuntimePaths';

/**
 * Logger handles kept open for the foreground Agents Server lifetime.
 *
 * @private internal type of `startAgentsServer`
 */
export type AgentsServerLogStreams = {
    readonly next: WriteStream;
    readonly runner: WriteStream;
};

/**
 * Creates file streams for service output persisted below `./logs`.
 *
 * @private internal utility of `startAgentsServer`
 */
export function createAgentsServerLogStreams(runtimePaths: AgentsServerRuntimePaths): AgentsServerLogStreams {
    return {
        next: createWriteStream(runtimePaths.nextLogPath, { flags: 'a' }),
        runner: createWriteStream(runtimePaths.runnerLogPath, { flags: 'a' }),
    };
}

/**
 * Closes all foreground service log streams.
 *
 * @private internal utility of `startAgentsServer`
 */
export function closeAgentsServerLogStreams(logStreams: AgentsServerLogStreams): void {
    logStreams.next.end();
    logStreams.runner.end();
}

/**
 * Appends one timestamped runner lifecycle event into its persistent log file.
 *
 * @private internal utility of `startAgentsServer`
 */
export function logRunnerEvent(logStream: WriteStream, event: string): void {
    logStream.write(`[${new Date().toISOString()}] ${event}\n`);
}
