import { spawn } from 'child_process';
import colors from 'colors';
import os from 'os';
import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../src/errors/UnexpectedError';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * If Rollup stays silent for longer than this, treat the build as locally stuck.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const ROLLUP_NO_OUTPUT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Rollup should exit almost immediately after printing the final `created ...` line.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const ROLLUP_EXIT_GRACE_PERIOD_MS = 30 * 1000;

/**
 * Interval for checking whether the Rollup subprocess stopped making progress.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const ROLLUP_HEALTH_CHECK_INTERVAL_MS = 5 * 1000;

/**
 * Matches Rollup's final success line.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const ROLLUP_CREATED_LINE_REGEX = /^created\s+.+\s+in\s+.+$/i;

/**
 * ANSI escape sequences emitted by Rollup's colored terminal output.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
// eslint-disable-next-line no-control-regex
const ROLLUP_ANSI_ESCAPE_REGEX = /\u001B\[[0-?]*[ -/]*[@-~]/gu;

/**
 * Upper bound for concurrently running package bundlers.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const MAX_PARALLEL_PACKAGE_BUILDS = 4;

/**
 * Conservative amount of memory reserved for one Rollup process when selecting
 * the default package-build concurrency.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const MINIMUM_MEMORY_PER_PACKAGE_BUILD_BYTES = 4 * 1024 * 1024 * 1024;

/**
 * Runtime diagnostics for the currently running Rollup build.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
type ActiveRollupBuild = {
    readonly packageBasename: string;
    readonly packageFullname: string;
    readonly startedAt: number;
    childPid: number | null;
    lastOutputAt: number;
    createdAt: number | null;
    lastLifecycleEvent: string;
};

/**
 * Diagnostics of the currently active Rollup subprocess.
 *
 * @private internal utility of buildGeneratedPackageBundles
 */
const activeRollupBuilds = new Map<string, ActiveRollupBuild>();

/**
 * Builds every bundle-producing package with bounded parallelism and diagnostics.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 * @private function of generatePackages
 */
export async function buildGeneratedPackageBundles(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`4️⃣  Generate bundle for each package`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler`));
        return;
    }

    const stopBuildResourceReporter = startBuildResourceReporter();
    const buildablePackages = packagesMetadata.filter(({ isBuilded }) => isBuilded);
    const packageBuildConcurrency = getPackageBuildConcurrency(buildablePackages.length);

    try {
        console.info(colors.yellow(`Building up to ${packageBuildConcurrency} packages in parallel`));
        await buildPackageBundlesInParallel(buildablePackages, packageBuildConcurrency);

        console.info(colors.green('✅✅ All packages built successfully'));
    } finally {
        stopBuildResourceReporter();
    }
}

/**
 * Selects a safe default number of package bundlers for the current machine.
 *
 * Package bundles are independent, but every Rollup process can use substantial
 * memory while TypeScript and the bundle graph are active. The result therefore
 * considers package count, CPU count, available system memory, and a hard cap.
 *
 * @param packageCount - Number of packages that need to be built
 * @returns Maximum number of package builds to run simultaneously
 * @private internal utility of buildGeneratedPackageBundles
 */
function getPackageBuildConcurrency(packageCount: number): number {
    if (packageCount <= 0) {
        return 0;
    }

    const cpuConcurrency = Math.max(1, os.availableParallelism() - 1);
    const memoryConcurrency = Math.max(
        1,
        Math.floor(os.totalmem() / MINIMUM_MEMORY_PER_PACKAGE_BUILD_BYTES),
    );

    return Math.min(packageCount, MAX_PARALLEL_PACKAGE_BUILDS, cpuConcurrency, memoryConcurrency);
}

/**
 * Runs package bundlers through a bounded worker pool.
 *
 * Existing workers finish their current packages after a failure, while no new
 * package is started. Waiting for all workers prevents orphaned Rollup processes
 * when the caller receives the first build error.
 *
 * @param buildablePackages - Packages that produce Rollup bundles
 * @param packageBuildConcurrency - Maximum number of active package builds
 * @returns Promise resolved after all started builds settle
 * @private internal utility of buildGeneratedPackageBundles
 */
async function buildPackageBundlesInParallel(
    buildablePackages: ReadonlyArray<PackageMetadata>,
    packageBuildConcurrency: number,
): Promise<void> {
    let nextPackageIndex = 0;
    let isBuildFailed = false;

    const buildWorker = async (): Promise<void> => {
        while (!isBuildFailed) {
            const packageIndex = nextPackageIndex++;

            if (packageIndex >= buildablePackages.length) {
                return;
            }

            const { packageBasename, packageFullname } = buildablePackages[packageIndex];

            console.info(`--- ${packageFullname} ---`);
            console.info(
                colors.blue(`📦 Building package ${packageIndex + 1}/${buildablePackages.length}: ${packageFullname}`),
            );

            try {
                await buildPackageBundle(packageBasename, packageFullname);
            } catch (error) {
                isBuildFailed = true;
                throw error;
            }

            console.info(colors.green(`✅ Package ${packageFullname} built successfully`));
        }
    };

    const workerResults = await Promise.allSettled(
        Array.from({ length: Math.min(packageBuildConcurrency, buildablePackages.length) }, () => buildWorker()),
    );

    for (const workerResult of workerResults) {
        if (workerResult.status === 'rejected') {
            throw workerResult.reason;
        }
    }
}

/**
 * Formats a duration for human-readable diagnostic logging.
 *
 * @param durationMs - Duration in milliseconds
 * @returns Human-readable duration string
 * @private internal utility of buildGeneratedPackageBundles
 */
function formatDurationForLog(durationMs: number): string {
    const normalizedDurationMs = Math.max(0, Math.round(durationMs));

    if (normalizedDurationMs < 1000) {
        return `${normalizedDurationMs}ms`;
    }

    const totalSeconds = Math.floor(normalizedDurationMs / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

/**
 * Creates a multiline diagnostic summary for the active Rollup subprocess.
 *
 * @param now - Timestamp used as the diagnostic reference point
 * @returns Formatted diagnostic summary
 * @private internal utility of buildGeneratedPackageBundles
 */
function summarizeActiveRollupBuild(now: number): string {
    const currentActiveRollupBuilds = Array.from(activeRollupBuilds.values());

    if (currentActiveRollupBuilds.length === 0) {
        return 'No Rollup subprocess is currently active.';
    }

    return currentActiveRollupBuilds
        .map((currentActiveRollupBuild) =>
            spaceTrim(`
                Package: \`${currentActiveRollupBuild.packageFullname}\`
                Package basename: \`${currentActiveRollupBuild.packageBasename}\`
                PID: ${currentActiveRollupBuild.childPid ?? 'pending'}
                Build runtime: ${formatDurationForLog(now - currentActiveRollupBuild.startedAt)}
                Time since last output: ${formatDurationForLog(now - currentActiveRollupBuild.lastOutputAt)}
                Last lifecycle event: ${currentActiveRollupBuild.lastLifecycleEvent}
                ${
                    currentActiveRollupBuild.createdAt === null
                        ? `Rollup has not reported the final bundle creation line yet.`
                        : `Time since Rollup reported final bundle creation: ${formatDurationForLog(
                              now - currentActiveRollupBuild.createdAt,
                          )}`
                }
            `),
        )
        .join('\n\n');
}

/**
 * Builds one package bundle with direct Node spawning instead of going through the shell.
 *
 * This avoids shell-specific hanging behavior on some local Windows setups and emits
 * explicit diagnostics when Rollup appears to finish bundling but never exits.
 *
 * @param packageBasename - Basename of the package to build
 * @param packageFullname - Full package name used in logs
 * @returns Promise resolved when the bundle process finishes successfully
 * @private internal utility of buildGeneratedPackageBundles
 */
async function buildPackageBundle(packageBasename: string, packageFullname: string): Promise<void> {
    const rollupArgs = [
        '--max-old-space-size=32000',
        './node_modules/rollup/dist/bin/rollup',
        '--config',
        'rollup.config.js',
    ];

    console.info(
        colors.yellow(process.cwd()) + ' ' + colors.green(process.execPath) + ' ' + colors.blue(rollupArgs.join(' ')),
    );

    await new Promise<void>((resolve, reject) => {
        const commandProcess = spawn(process.execPath, rollupArgs, {
            cwd: process.cwd(),
            shell: false,
            env: {
                ...process.env,
                PACKAGE_BASENAME: packageBasename,
            },
        });

        const output: Array<string> = [];
        let stdoutBuffer = '';
        let stderrBuffer = '';
        let isSettled = false;
        let isProcessClosed = false;
        let isSuccessfulTerminationRequested = false;
        let hangError: UnexpectedError | null = null;
        let healthCheckInterval: NodeJS.Timeout | null = null;
        let forceKillTimeout: NodeJS.Timeout | null = null;

        activeRollupBuilds.set(packageBasename, {
            packageBasename,
            packageFullname,
            startedAt: Date.now(),
            childPid: commandProcess.pid ?? null,
            lastOutputAt: Date.now(),
            createdAt: null,
            lastLifecycleEvent: 'Spawn requested',
        });

        /**
         * Clears timers and the currently active diagnostics.
         */
        function cleanup(): void {
            if (healthCheckInterval !== null) {
                clearInterval(healthCheckInterval);
            }

            if (forceKillTimeout !== null) {
                clearTimeout(forceKillTimeout);
            }

            activeRollupBuilds.delete(packageBasename);
        }

        /**
         * Resolves or rejects the subprocess promise only once.
         *
         * @param callback - Completion callback
         */
        function settle(callback: () => void): void {
            if (isSettled) {
                return;
            }

            isSettled = true;
            cleanup();
            callback();
        }

        /**
         * Tracks Rollup line-oriented progress messages from streamed output.
         *
         * @param line - One complete output line
         */
        function inspectOutputLine(line: string): void {
            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild === undefined) {
                return;
            }

            const normalizedLine = line.replace(ROLLUP_ANSI_ESCAPE_REGEX, '').trim();

            if (currentActiveRollupBuild.createdAt === null && ROLLUP_CREATED_LINE_REGEX.test(normalizedLine)) {
                currentActiveRollupBuild.createdAt = Date.now();
                currentActiveRollupBuild.lastLifecycleEvent = 'Rollup reported final bundle creation';

                console.error(
                    colors.yellow(
                        `⌛ Rollup finished writing ${packageFullname}; waiting for the subprocess to exit cleanly`,
                    ),
                );
            }
        }

        /**
         * Proxies subprocess output while updating progress diagnostics.
         *
         * @param chunk - Raw output chunk
         * @param streamName - Source stream name
         */
        function handleOutput(chunk: Buffer, streamName: 'stdout' | 'stderr'): void {
            const outputText = chunk.toString();
            output.push(outputText);

            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild !== undefined) {
                currentActiveRollupBuild.lastOutputAt = Date.now();
                currentActiveRollupBuild.lastLifecycleEvent = `Received ${streamName} output`;
            }

            forwardRollupOutput(outputText, streamName, commandProcess);

            const combinedOutput = `${streamName === 'stdout' ? stdoutBuffer : stderrBuffer}${outputText}`;
            const outputLines = combinedOutput.split(/\r?\n/);
            const nextBuffer = outputLines.pop() ?? '';

            if (streamName === 'stdout') {
                stdoutBuffer = nextBuffer;
            } else {
                stderrBuffer = nextBuffer;
            }

            for (const outputLine of outputLines) {
                inspectOutputLine(outputLine);
            }
        }

        /**
         * Requests termination when Rollup appears stuck and preserves detailed context.
         *
         * @param reason - Human-readable explanation of why the build is considered stuck
         */
        function requestTerminationForHang(reason: string): void {
            if (hangError !== null) {
                return;
            }

            const now = Date.now();

            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild !== undefined) {
                currentActiveRollupBuild.lastLifecycleEvent = reason;
            }

            const diagnosticSummary = summarizeActiveRollupBuild(now);

            console.error(
                colors.red(
                    spaceTrim(
                        (block) => `
                            Package bundling looks stuck.

                            ${block(reason)}
                            ${block(diagnosticSummary)}
                        `,
                    ),
                ),
            );

            hangError = new UnexpectedError(
                spaceTrim(
                    (block) => `
                        Package bundling got stuck for \`${packageFullname}\`.

                        ${block(reason)}
                        ${block(diagnosticSummary)}

                        The Rollup subprocess was terminated to prevent waiting forever.
                    `,
                ),
            );

            terminateRollupProcess();
        }

        /**
         * Terminates a Rollup process that has already produced all bundle files.
         *
         * @private internal utility of buildPackageBundle
         */
        function requestSuccessfulTermination(): void {
            if (isSuccessfulTerminationRequested) {
                return;
            }

            isSuccessfulTerminationRequested = true;
            console.error(
                colors.yellow(
                    `⌛ Rollup produced the final bundle for ${packageFullname}; terminating its lingering process`,
                ),
            );
            terminateRollupProcess();
        }

        /**
         * Requests a graceful process termination and schedules a force kill fallback.
         *
         * @private internal utility of buildPackageBundle
         */
        function terminateRollupProcess(): void {
            commandProcess.kill();

            forceKillTimeout = setTimeout(() => {
                if (!isProcessClosed) {
                    console.error(colors.red(`Force-killing Rollup subprocess PID ${commandProcess.pid ?? 'unknown'}`));
                    commandProcess.kill('SIGKILL');
                }
            }, 5 * 1000);
        }

        healthCheckInterval = setInterval(() => {
            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild === undefined) {
                return;
            }

            const now = Date.now();
            const timeSinceLastOutput = now - currentActiveRollupBuild.lastOutputAt;

            if (
                currentActiveRollupBuild.createdAt !== null &&
                now - currentActiveRollupBuild.createdAt > ROLLUP_EXIT_GRACE_PERIOD_MS
            ) {
                requestSuccessfulTermination();
                return;
            }

            if (timeSinceLastOutput > ROLLUP_NO_OUTPUT_TIMEOUT_MS) {
                requestTerminationForHang(
                    `Rollup produced no output for ${formatDurationForLog(timeSinceLastOutput)}.`,
                );
            }
        }, ROLLUP_HEALTH_CHECK_INTERVAL_MS);

        commandProcess.on('spawn', () => {
            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild !== undefined) {
                currentActiveRollupBuild.childPid = commandProcess.pid ?? null;
                currentActiveRollupBuild.lastLifecycleEvent = 'Rollup subprocess spawned';
            }
        });

        commandProcess.stdout.on('data', (chunk) => {
            handleOutput(chunk, 'stdout');
        });

        commandProcess.stderr.on('data', (chunk) => {
            handleOutput(chunk, 'stderr');
        });

        commandProcess.on('exit', (code, signal) => {
            const currentActiveRollupBuild = activeRollupBuilds.get(packageBasename);

            if (currentActiveRollupBuild !== undefined) {
                currentActiveRollupBuild.lastLifecycleEvent = `Rollup subprocess exited with code=${code ?? 'null'} signal=${
                    signal ?? 'null'
                }`;
            }
        });

        commandProcess.on('error', (error) => {
            settle(() => {
                reject(
                    new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Rollup subprocess failed for \`${packageFullname}\`.

                                ${block(error.message)}
                            `,
                        ),
                    ),
                );
            });
        });

        commandProcess.on('close', (code, signal) => {
            isProcessClosed = true;

            if (stdoutBuffer !== '') {
                inspectOutputLine(stdoutBuffer);
            }

            if (stderrBuffer !== '') {
                inspectOutputLine(stderrBuffer);
            }

            settle(() => {
                if (hangError !== null) {
                    reject(hangError);
                    return;
                }

                if (isSuccessfulTerminationRequested) {
                    resolve();
                    return;
                }

                if (code === 0) {
                    resolve();
                    return;
                }

                reject(
                    new UnexpectedError(
                        spaceTrim(
                            (block) => `
                                Rollup subprocess failed for \`${packageFullname}\`.

                                Exit code: ${code ?? 'null'}
                                Exit signal: ${signal ?? 'null'}
                                ${block(spaceTrim(output.join('\n')).trim())}
                            `,
                        ),
                    ),
                );
            });
        });
    });
}

/**
 * Forwards one Rollup output chunk without allowing the parent output stream to
 * silently fill and stall the child process.
 *
 * @param outputText - Output chunk received from Rollup
 * @param streamName - Source stream name
 * @param commandProcess - Rollup subprocess whose stream may need pausing
 * @private internal utility of buildGeneratedPackageBundles
 */
function forwardRollupOutput(
    outputText: string,
    streamName: 'stdout' | 'stderr',
    commandProcess: ReturnType<typeof spawn>,
): void {
    const outputStream = streamName === 'stdout' ? process.stdout : process.stderr;
    const rollupOutputStream = streamName === 'stdout' ? commandProcess.stdout : commandProcess.stderr;

    if (rollupOutputStream === null) {
        return;
    }

    const isOutputStreamReady = outputStream.write(outputText);

    if (!isOutputStreamReady) {
        rollupOutputStream.pause();
        outputStream.once('drain', () => rollupOutputStream.resume());
    }
}

/**
 * Starts the periodic resource logger used while Rollup builds are running.
 *
 * @returns Cleanup callback that stops the reporter
 * @private internal utility of buildGeneratedPackageBundles
 */
function startBuildResourceReporter(): () => void {
    let minutesCount = 0;
    let lastTick = Date.now();
    const timeReportingInterval = setInterval(() => {
        minutesCount++;

        const mem = process.memoryUsage();
        const rss = (mem.rss / 1024 / 1024).toFixed(1);
        const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
        const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
        const load = os.loadavg()[0].toFixed(2);

        const now = Date.now();
        const eventLoopLag = now - lastTick - 60_000;
        lastTick = now;

        console.error(`::group::Node Used resources`);
        console.error(colors.yellow(`🕑 Building ${minutesCount} minutes`));
        console.error(`🧠 Memory: rss=${rss}MB heapUsed=${heapUsed}MB heapTotal=${heapTotal}MB`);
        console.error(`⚙️ CPU load (1m): ${load}`);
        console.error(`⌛ Event loop lag: ${eventLoopLag}ms`);
        for (const currentActiveRollupBuild of activeRollupBuilds.values()) {
            console.error(`📦 Active bundle: ${currentActiveRollupBuild.packageFullname}`);
            console.error(`🆔 Rollup PID: ${currentActiveRollupBuild.childPid ?? 'pending'}`);
            console.error(
                `🔇 Time since last Rollup output: ${formatDurationForLog(now - currentActiveRollupBuild.lastOutputAt)}`,
            );
            console.error(`🧾 Rollup state: ${currentActiveRollupBuild.lastLifecycleEvent}`);
            if (currentActiveRollupBuild.createdAt !== null) {
                console.error(
                    `🏁 Time since Rollup reported bundle creation: ${formatDurationForLog(
                        now - currentActiveRollupBuild.createdAt,
                    )}`,
                );
            }
        }
        console.error(`::endgroup::`);
    }, 60 * 1000);

    return () => {
        clearInterval(timeReportingInterval);
    };
}

// Note: [⚫] Code for repository script [buildGeneratedPackageBundles](scripts/generate-packages/buildGeneratedPackageBundles.ts) should never be published in any package
