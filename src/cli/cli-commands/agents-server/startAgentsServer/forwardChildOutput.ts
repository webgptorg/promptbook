import type { WriteStream } from 'fs';
import { addUiOutput, type AgentsServerSupervisorState } from './AgentsServerSupervisorState';

/**
 * Persists one child output chunk and forwards readable lines into UI or plain output.
 *
 * @private internal utility of `startAgentsServer`
 */
export function forwardChildOutput(
    chunk: string,
    options: {
        readonly label: string;
        readonly logStream: WriteStream;
        readonly state: AgentsServerSupervisorState;
    },
): void {
    options.logStream.write(chunk);

    const visibleLines = chunk
        .split(/\r?\n/gu)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);

    for (const line of visibleLines) {
        const labeledLine = `[${options.label}] ${line}`;
        if (options.state.uiHandle) {
            addUiOutput(options.state, labeledLine);
        } else {
            process.stdout.write(`${labeledLine}\n`);
        }
    }
}
