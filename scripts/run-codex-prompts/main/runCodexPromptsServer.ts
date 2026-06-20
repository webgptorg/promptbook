import colors from 'colors';
import type { number_port } from '../../../src/types/number_positive';
import type { RunOptions } from '../cli/RunOptions';
import { startCoderHttpServer } from '../server/runCoderHttpServer';
import { runCodexPrompts } from './runCodexPrompts';

/**
 * Options for `ptbk coder server` combining the standard run options with a server port.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderServerRunOptions = RunOptions & {
    /**
     * TCP port on which the kanban HTTP server will listen.
     */
    port: number_port;
};

/**
 * Starts the coder server: runs prompt processing in keepAlive mode while serving a
 * kanban web UI and REST API on the given port.
 *
 * Differences from `runCodexPrompts`:
 * - Does not exit when no runnable prompts are available; instead it polls every few seconds
 *   and resumes processing as soon as a new prompt becomes ready.
 * - Starts a lightweight HTTP server that serves a kanban board at `http://localhost:<port>`
 *   and exposes REST endpoints for reading prompts, controlling pause state, and editing
 *   prompt files directly from the browser.
 *
 * @private internal function of `ptbk coder server`
 */
export async function runCodexPromptsServer(options: CoderServerRunOptions): Promise<void> {
    const { port, ...runOptions } = options;

    const serverHandle = startCoderHttpServer(port);

    console.info(colors.gray('Starting prompt runner in server (keep-alive) mode…'));

    try {
        await runCodexPrompts({
            ...runOptions,
            keepAlive: true,
        });
    } finally {
        serverHandle.close();
    }
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/main/runCodexPromptsServer.ts) should never be published outside of `@promptbook/cli`
