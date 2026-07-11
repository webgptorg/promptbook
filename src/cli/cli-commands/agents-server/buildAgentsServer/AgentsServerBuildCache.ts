import { AGENTS_SERVER_BUILD_CACHE_VERSION } from './AGENTS_SERVER_BUILD_CACHE_VERSION';

/**
 * Metadata persisted after one successful Agents Server production build.
 *
 * @private internal type of `buildAgentsServer`
 */
export type AgentsServerBuildCache = {
    readonly version: typeof AGENTS_SERVER_BUILD_CACHE_VERSION;
    readonly sourceFingerprint: string;
};
