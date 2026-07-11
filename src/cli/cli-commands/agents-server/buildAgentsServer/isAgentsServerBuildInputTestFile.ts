/**
 * Test files copied out of packaged runtime input paths because Next does not build them.
 */
const AGENTS_SERVER_BUILD_INPUT_TEST_FILE_PATTERN = /\.(?:spec|test)(?:\.|$)/iu;

/**
 * Type-only compile check files copied out of packaged runtime input paths.
 */
const AGENTS_SERVER_BUILD_INPUT_TEST_TYPE_FILE_PATTERN = /\.test-type\.[jt]sx?$/iu;

/**
 * Returns true for test files that should not affect packaged Agents Server builds.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isAgentsServerBuildInputTestFile(inputBasename: string): boolean {
    return (
        AGENTS_SERVER_BUILD_INPUT_TEST_FILE_PATTERN.test(inputBasename) ||
        AGENTS_SERVER_BUILD_INPUT_TEST_TYPE_FILE_PATTERN.test(inputBasename)
    );
}
