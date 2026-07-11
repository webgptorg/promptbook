// Note: This file is a thin facade over the focused modules under `./buildAgentsServer/`.
//       It keeps the local Agents Server build API stable while runtime preparation,
//       materialization, fingerprinting, cache handling, and Next build execution are
//       split into small single-responsibility modules.

export {
    createAgentsServerRuntimeEnvironment,
    PTBK_AGENTS_SERVER_BUILD_WORKER_COUNT_ENV,
    PTBK_AGENTS_SERVER_IGNORE_NEXT_VALIDATION_ENV,
    PTBK_AGENTS_SERVER_NODE_MODULES_PATH_ENV,
} from './buildAgentsServer/createAgentsServerRuntimeEnvironment';
export { ensureAgentsServerBuild } from './buildAgentsServer/ensureAgentsServerBuild';
export { isAgentsServerBuildCacheCurrent } from './buildAgentsServer/isAgentsServerBuildCacheCurrent';
export { prepareAgentsServerRuntime } from './buildAgentsServer/prepareAgentsServerRuntime';
export { resolveAgentsServerAppPath } from './buildAgentsServer/resolveAgentsServerAppPath';
export { resolveAgentsServerBuildAppPath } from './buildAgentsServer/resolveAgentsServerBuildAppPath';
export { writeAgentsServerBuildCache } from './buildAgentsServer/writeAgentsServerBuildCache';

export type {
    AgentsServerBuildArtifacts,
    PreparedAgentsServerRuntime,
} from './buildAgentsServer/PreparedAgentsServerRuntime';

// Note: [🟡] Code for CLI runtime [buildAgentsServer](src/cli/cli-commands/agents-server/buildAgentsServer.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
