/**
 * Runtime source files excluded from the packaged Agents Server copy.
 */
const AGENTS_SERVER_BUILD_INPUT_EXCLUDED_SOURCE_PATHS = new Set([
    'src/_packages/browser.index.ts',
    'src/_packages/browser.readme.md',
    'src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground.ts',
    'src/llm-providers/_common/utils/assertUniqueModels.ts',
]);

/**
 * Runtime source folders excluded from the packaged Agents Server copy.
 */
const AGENTS_SERVER_BUILD_INPUT_EXCLUDED_SOURCE_PATH_PREFIXES = [
    'src/dialogs/simple-prompt',
    'src/storage/local-storage',
] as const;

/**
 * Returns true for runtime source files and folders that are not needed by the Agents Server build.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isExcludedAgentsServerRuntimeSourcePath(sourceRuntimeRelativePath: string): boolean {
    return (
        AGENTS_SERVER_BUILD_INPUT_EXCLUDED_SOURCE_PATHS.has(sourceRuntimeRelativePath) ||
        AGENTS_SERVER_BUILD_INPUT_EXCLUDED_SOURCE_PATH_PREFIXES.some((excludedSourcePathPrefix) =>
            isRuntimePathWithin(sourceRuntimeRelativePath, excludedSourcePathPrefix),
        )
    );
}

/**
 * Checks whether one normalized runtime path is equal to or nested below another path.
 */
function isRuntimePathWithin(sourceRuntimeRelativePath: string, excludedSourcePathPrefix: string): boolean {
    return (
        sourceRuntimeRelativePath === excludedSourcePathPrefix ||
        sourceRuntimeRelativePath.startsWith(`${excludedSourcePathPrefix}/`)
    );
}
