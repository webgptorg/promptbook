import { cp, mkdir, rm } from 'fs/promises';
import { basename, dirname, relative } from 'path';

/**
 * Directory names excluded from the generated CLI runtime copy.
 *
 * @private internal constant of package generation
 */
const AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_DIRECTORY_NAMES = new Set([
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
 * Source files that are not needed by the embedded Agents Server runtime.
 *
 * @private internal constant of package generation
 */
const AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_SOURCE_PATHS = new Set([
    'src/_packages/browser.index.ts',
    'src/_packages/browser.readme.md',
    'src/llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground.ts',
    'src/llm-providers/_common/utils/assertUniqueModels.ts',
]);

/**
 * Source folders that are not needed by the embedded Agents Server runtime.
 *
 * @private internal constant of package generation
 */
const AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_SOURCE_PATH_PREFIXES = [
    'src/dialogs/simple-prompt',
    'src/storage/local-storage',
] as const;

/**
 * Test files copied out of packaged runtime input paths because Next does not build them.
 *
 * @private internal constant of package generation
 */
const AGENTS_SERVER_RUNTIME_PACKAGE_TEST_FILE_PATTERN = /\.(?:spec|test)(?:\.|$)/iu;

/**
 * Type-only compile check files copied out of packaged runtime input paths.
 *
 * @private internal constant of package generation
 */
const AGENTS_SERVER_RUNTIME_PACKAGE_TEST_TYPE_FILE_PATTERN = /\.test-type\.[jt]sx?$/iu;

/**
 * Copies one runtime path into the generated CLI package after removing stale output.
 *
 * @param sourcePath - Path in the monorepo runtime layout
 * @param destinationPath - Equivalent path below `packages/cli`
 * @private internal utility of package generation
 */
export async function copyAgentsServerRuntimePathToCliPackage(
    sourcePath: string,
    destinationPath: string,
): Promise<void> {
    console.info(`Copying ${sourcePath} to ${destinationPath}`);

    await rm(destinationPath, { recursive: true, force: true });
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, {
        recursive: true,
        filter: (currentSourcePath) => shouldCopyAgentsServerRuntimePath(currentSourcePath, sourcePath),
    });
}

/**
 * Excludes build artifacts, local databases and journals, private env files, and test sources from packages.
 *
 * @param sourcePath - Path currently visited by `fs.cp`
 * @param sourceRootPath - Root path being copied
 * @returns `true` when the package copy should include the path
 * @private internal utility of package generation
 */
function shouldCopyAgentsServerRuntimePath(sourcePath: string, sourceRootPath: string): boolean {
    const sourceRelativePath = relative(sourceRootPath, sourcePath).replace(/\\/gu, '/');
    const sourceRuntimeRelativePath = normalizeRuntimeSourceRelativePath(sourcePath, sourceRootPath);
    const sourcePathSegments = sourceRelativePath.split('/').filter(Boolean);
    const sourceBasename = basename(sourcePath);

    if (
        sourcePathSegments.some((sourcePathSegment) =>
            AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_DIRECTORY_NAMES.has(sourcePathSegment),
        )
    ) {
        return false;
    }

    if (sourcePathSegments.includes('playground')) {
        return false;
    }

    if (AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_SOURCE_PATHS.has(sourceRuntimeRelativePath)) {
        return false;
    }

    if (
        AGENTS_SERVER_RUNTIME_PACKAGE_EXCLUDED_SOURCE_PATH_PREFIXES.some((excludedSourcePathPrefix) =>
            isRuntimePathWithin(sourceRuntimeRelativePath, excludedSourcePathPrefix),
        )
    ) {
        return false;
    }

    if (sourceBasename.startsWith('.env') || /\.(?:sqlite3?|db)(?:-.*)?$/iu.test(sourceBasename)) {
        return false;
    }

    return (
        !AGENTS_SERVER_RUNTIME_PACKAGE_TEST_FILE_PATTERN.test(sourceBasename) &&
        !AGENTS_SERVER_RUNTIME_PACKAGE_TEST_TYPE_FILE_PATTERN.test(sourceBasename)
    );
}

/**
 * Normalizes a copied runtime path to the shape used inside `packages/cli`.
 *
 * @param sourcePath - Path currently visited by `fs.cp`
 * @param sourceRootPath - Root path being copied
 * @returns Runtime-relative path with POSIX separators
 * @private internal utility of package generation
 */
function normalizeRuntimeSourceRelativePath(sourcePath: string, sourceRootPath: string): string {
    const sourceRelativePath = relative(sourceRootPath, sourcePath).replace(/\\/gu, '/');
    const sourceRootBasename = basename(sourceRootPath);

    if (!sourceRelativePath) {
        return sourceRootBasename;
    }

    return `${sourceRootBasename}/${sourceRelativePath}`;
}

/**
 * Checks whether one normalized runtime path is equal to or nested below another path.
 *
 * @param sourceRuntimeRelativePath - Runtime-relative path to check
 * @param excludedSourcePathPrefix - Runtime-relative path that should be excluded
 * @returns Whether `sourceRuntimeRelativePath` is inside `excludedSourcePathPrefix`
 * @private internal utility of package generation
 */
function isRuntimePathWithin(sourceRuntimeRelativePath: string, excludedSourcePathPrefix: string): boolean {
    return (
        sourceRuntimeRelativePath === excludedSourcePathPrefix ||
        sourceRuntimeRelativePath.startsWith(`${excludedSourcePathPrefix}/`)
    );
}

// Note: [⚫] Code for repository script [copyAgentsServerRuntimePathToCliPackage](scripts/generate-packages/copyAgentsServerRuntimePathToCliPackage.ts) should never be published in any package
