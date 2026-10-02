/**
 * Directory names excluded while copying or fingerprinting production build inputs.
 */
const AGENTS_SERVER_BUILD_INPUT_EXCLUDED_DIRECTORY_NAMES = new Set([
    '.git',
    '.next',
    '.next-e2e',
    '.promptbook',
    'coverage',
    'node_modules',
    'playwright-report',
    'test-results',
]);

/**
 * Returns true when a directory segment should not affect Agents Server production builds.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isExcludedAgentsServerBuildInputDirectoryName(directoryName: string): boolean {
    return AGENTS_SERVER_BUILD_INPUT_EXCLUDED_DIRECTORY_NAMES.has(directoryName);
}
