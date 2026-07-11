import { delimiter } from 'path';

/**
 * Environment variable passed to the bundled Next app so webpack can resolve dependencies
 * installed beside `ptbk` even when the app sources are materialized into a project cache.
 *
 * @private internal constant of `buildAgentsServer`
 */
export const PTBK_AGENTS_SERVER_NODE_MODULES_PATH_ENV = 'PTBK_AGENTS_SERVER_NODE_MODULES_PATH';

/**
 * Environment variable consumed by `apps/agents-server/next.config.ts` to throttle build workers.
 *
 * @private internal constant of `buildAgentsServer`
 */
export const PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT_ENV = 'PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT';

/**
 * Environment variable used only by the CLI-owned production build.
 *
 * @private internal constant of `buildAgentsServer`
 */
export const PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION_ENV = 'PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION';

/**
 * Conservative Next.js build worker count used by CLI-owned Agents Server production builds.
 *
 * Standalone VPS self-updates build the replacement server while the current pm2 process is
 * still serving traffic. Keeping Next's static workers serial avoids CPU-count-based memory
 * spikes that can make the OS kill the build child with no normal exit code.
 */
const AGENTS_SERVER_BUILD_WORKER_COUNT = 1;

/**
 * Adds dependency-resolution environment required by the materialized Agents Server runtime.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function createAgentsServerRuntimeEnvironment(
    environment: NodeJS.ProcessEnv,
    nodeModulesPath: string,
    options: {
        readonly isNextValidationIgnored?: boolean;
    } = {},
): NodeJS.ProcessEnv {
    return {
        ...environment,
        NODE_PATH: mergeNodePath(nodeModulesPath, environment.NODE_PATH),
        [PTBK_AGENTS_SERVER_NODE_MODULES_PATH_ENV]: nodeModulesPath,
        [PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT_ENV]:
            environment[PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT_ENV] || String(AGENTS_SERVER_BUILD_WORKER_COUNT),
        ...(options.isNextValidationIgnored
            ? {
                  [PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION_ENV]: 'true',
              }
            : {}),
    };
}

/**
 * Prepends one dependency root to `NODE_PATH` while preserving any existing value.
 */
function mergeNodePath(nodeModulesPath: string, nodePath: string | undefined): string {
    if (!nodePath) {
        return nodeModulesPath;
    }

    return `${nodeModulesPath}${delimiter}${nodePath}`;
}
