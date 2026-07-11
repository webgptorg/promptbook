/**
 * Paths needed after the Agents Server production build is ready.
 *
 * @private internal type of `buildAgentsServer`
 */
export type AgentsServerBuildArtifacts = {
    readonly appPath: string;
    readonly nodeModulesPath: string;
    readonly nextCliPath: string;
};

/**
 * Runtime paths resolved for Agents Server commands before choosing build or dev execution.
 *
 * @private internal type of `buildAgentsServer`
 */
export type PreparedAgentsServerRuntime = AgentsServerBuildArtifacts & {
    readonly isAppPathMaterialized: boolean;
};
