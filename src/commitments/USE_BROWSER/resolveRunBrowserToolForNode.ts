import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../_packages/types.index';

/**
 * Fallback error used when Agents Server browser runtime is not available.
 */
const FALLBACK_RUN_BROWSER_ERROR = spaceTrim(`
    run_browser tool is not available in this environment.
    This commitment requires the Agents Server browser runtime with Playwright CLI.
`);

/**
 * Resolves the server-side implementation of the `run_browser` tool for Node.js environments.
 *
 * This uses lazy `require` to keep the core package decoupled from Agents Server internals.
 * When the server tool cannot be resolved, the fallback implementation throws a helpful error.
 *
 * @private internal utility for USE BROWSER commitment
 */
export function resolveRunBrowserToolForNode(): ToolFunction {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { run_browser } = require('../../../apps/agents-server/src/tools/run_browser');

        if (typeof run_browser !== 'function') {
            throw new Error('run_browser value is not a function');
        }

        return run_browser as ToolFunction;
    } catch {
        return async () => {
            throw new Error(FALLBACK_RUN_BROWSER_ERROR);
        };
    }
}
