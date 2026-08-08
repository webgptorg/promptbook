'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

/**
 * Root directory of the Agents Server app.
 */
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Root directory of the repository, which owns the shared build and test scripts.
 */
const PROJECT_ROOT = path.resolve(APP_ROOT, '..', '..');

/**
 * Maximum Node.js heap size used by the Next.js production build.
 */
const AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB = 8192;

/**
 * Runs the shared Agents Server production build and its homepage prerender step.
 *
 * The optional `--no-lint` argument is used by the E2E runner after the same app
 * lint command has already completed successfully. The optional `--no-homepage-prerender`
 * argument is used by builds whose caller starts the very same production server right
 * afterwards, which makes the extra prerender server a repetition of that work.
 */
function buildAgentsServer() {
    const nextBuildArguments = [
        '-r',
        path.join(PROJECT_ROOT, 'scripts', 'ignore-kill-eperm.js'),
        path.join(APP_ROOT, 'scripts', 'next-cli.js'),
        'build',
    ];

    if (process.argv.includes('--no-lint')) {
        nextBuildArguments.push('--no-lint');
    }

    runChildProcess(process.execPath, nextBuildArguments, {
        // Note: Next.js compiles each webpack target in its own build worker process, and a worker
        //       inherits the heap limit only through `NODE_OPTIONS` - not through the command line of
        //       the build process which spawned it. The same merge is done for the CLI-owned
        //       production build in `src/cli/cli-commands/agents-server/buildAgentsServer/runNextBuild.ts`.
        NODE_OPTIONS: mergeNodeOptionsWithHeapSize(process.env.NODE_OPTIONS, AGENTS_SERVER_BUILD_MAX_OLD_SPACE_MIB),
    });

    if (!process.argv.includes('--no-homepage-prerender')) {
        runChildProcess(process.execPath, [path.join(APP_ROOT, 'scripts', 'prerender-homepage.js')]);
    }
}

/**
 * Prepends `--max-old-space-size=<mib>` to `NODE_OPTIONS` unless the caller already set one.
 *
 * @param existingNodeOptions - Inherited `NODE_OPTIONS` value.
 * @param maxOldSpaceMib - Maximum Node.js heap size in MiB.
 * @returns `NODE_OPTIONS` value for the build process.
 */
function mergeNodeOptionsWithHeapSize(existingNodeOptions, maxOldSpaceMib) {
    if (existingNodeOptions !== undefined && /--max-old-space-size[= ]/u.test(existingNodeOptions)) {
        return existingNodeOptions;
    }

    const heapFlag = `--max-old-space-size=${maxOldSpaceMib}`;

    return existingNodeOptions ? `${heapFlag} ${existingNodeOptions}` : heapFlag;
}

/**
 * Runs one child process and forwards its exit status.
 *
 * @param executablePath - Executable to run.
 * @param argumentsList - Arguments passed to the executable.
 * @param environmentOverrides - Environment variables added on top of the inherited environment.
 */
function runChildProcess(executablePath, argumentsList, environmentOverrides = {}) {
    const result = spawnSync(executablePath, argumentsList, {
        cwd: APP_ROOT,
        env: {
            ...process.env,
            ...environmentOverrides,
        },
        stdio: 'inherit',
    });

    if (result.error) {
        console.error(`Failed to run ${executablePath}:`, result.error);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

buildAgentsServer();
