import { createInterface } from 'readline';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import type { PlanningSessionIo } from './runPlanningSession';

/**
 * Builds an EOF-aware terminal. EOF or Ctrl+C also cancels an in-flight harness turn.
 * @private internal utility of `coder plan`
 */
export function createPlanningTerminal(): PlanningSessionIo & { readonly close: () => void } {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new NotAllowed(
            spaceTrim(
                '`ptbk coder plan` requires an interactive terminal for conversation and reviewing PRD changes. Run it in a terminal; use `ptbk coder add "description"` for non-interactive prompt creation.',
            ),
        );
    }
    const controller = new AbortController();
    const reader = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const queued: string[] = [];
    let pending: ((message: string | undefined) => void) | undefined;
    /** Cancels the active turn and releases any pending input promise. */
    const cancel = (): void => {
        controller.abort();
        pending?.(undefined);
        pending = undefined;
        reader.close();
    };
    process.on('SIGINT', cancel);
    reader.on('SIGINT', cancel);
    reader.on('close', cancel);
    reader.on('line', (line) => {
        if (pending) {
            const resolve = pending;
            pending = undefined;
            resolve(line);
        } else queued.push(line);
    });
    return {
        signal: controller.signal,
        write: (message) => console.info(message),
        readMessage: async () => {
            if (controller.signal.aborted) return undefined;
            if (queued.length) return queued.shift();
            reader.setPrompt('You: ');
            reader.prompt();
            return new Promise((resolve) => {
                pending = resolve;
            });
        },
        close: () => {
            process.removeListener('SIGINT', cancel);
            reader.removeListener('close', cancel);
            reader.close();
        },
    };
}
