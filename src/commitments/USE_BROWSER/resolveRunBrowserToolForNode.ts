import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../_packages/types.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { assertsError } from '../../errors/assertsError';

/**
 * Cached implementation of `run_browser` when it can be resolved.
 *
 * @private internal utility for USE BROWSER commitment
 */
let cachedRunBrowserTool: ToolFunction | null = null;

/**
 * Cached loading error to avoid repeating expensive resolution attempts.
 *
 * @private internal utility for USE BROWSER commitment
 */
let cachedRunBrowserToolError: Error | null = null;

/**
 * Attempts to load the server-side `run_browser` tool lazily.
 *
 * @returns Loaded `run_browser` implementation
 *
 * @private internal utility for USE BROWSER commitment
 */
function loadRunBrowserToolForNode(): ToolFunction {
    if (cachedRunBrowserTool !== null) {
        return cachedRunBrowserTool;
    }

    if (cachedRunBrowserToolError !== null) {
        throw cachedRunBrowserToolError;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runBrowserModule = require('../../../apps/agents-server/src/tools/run_browser') as {
            run_browser?: unknown;
        };

        if (typeof runBrowserModule.run_browser !== 'function') {
            throw new Error('run_browser value is not a function but ' + typeof runBrowserModule.run_browser);
        }

        cachedRunBrowserTool = runBrowserModule.run_browser as ToolFunction;
        return cachedRunBrowserTool;
    } catch (error) {
        assertsError(error);
        cachedRunBrowserToolError = error;
        throw error;
    }
}

/**
 * Resolves the server-side implementation of the `run_browser` tool for Node.js environments.
 *
 * This uses fully lazy resolution to keep CLI startup independent from optional browser tooling.
 * When the server tool cannot be resolved, the fallback implementation throws a helpful error.
 *
 * @private internal utility for USE BROWSER commitment
 */
export function resolveRunBrowserToolForNode(): ToolFunction {
    return async (args) => {
        try {
            const runBrowserTool = loadRunBrowserToolForNode();
            return await runBrowserTool(args);
        } catch (error) {
            assertsError(error);
            throw new EnvironmentMismatchError(
                spaceTrim(
                    (block) => `
                        \`run_browser\` tool is not available in this environment.
                        This commitment requires the Agents Server browser runtime with Playwright CLI.

                        ${(error as Error).name}:
                        ${block((error as Error).message)}
                    `,
                ),
            );
        }
    };
}
