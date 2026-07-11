/**
 * Input paths required to validate or update the cached Agents Server build.
 *
 * @private internal type of `buildAgentsServer`
 */
export type AgentsServerBuildCacheOptions = {
    readonly appPath: string;
    readonly environment?: NodeJS.ProcessEnv;
};
