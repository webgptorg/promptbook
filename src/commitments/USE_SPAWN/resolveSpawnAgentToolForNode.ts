import { spaceTrim } from 'spacetrim';
import type { ToolFunction } from '../../_packages/types.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';

/**
 * Resolves the server-side `spawn_agent` tool for Node.js runtimes.
 *
 * Uses lazy require so core package can load outside Agents Server.
 *
 * @private internal utility for USE SPAWN commitment
 */
export function resolveSpawnAgentToolForNode(): ToolFunction {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { spawn_agent } = require('../../../apps/agents-server/src/tools/spawn_agent');

        if (typeof spawn_agent !== 'function') {
            throw new Error('spawn_agent value is not a function but ' + typeof spawn_agent);
        }

        return spawn_agent as ToolFunction;
    } catch (error) {
        const normalizedError =
            error instanceof Error
                ? error
                : new Error(typeof error === 'string' ? error : JSON.stringify(error ?? 'Unknown error'));

        return async () => {
            throw new EnvironmentMismatchError(
                spaceTrim(
                    (block) => `
                        \`spawn_agent\` tool is not available in this environment.
                        This commitment requires Agents Server runtime with agent persistence enabled.

                        ${normalizedError.name}:
                        ${block(normalizedError.message)}
                    `,
                ),
            );
        };
    }
}
