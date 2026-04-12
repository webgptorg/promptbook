import { spawn } from 'child_process';
import colors from 'colors';
import os from 'os';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
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
let activeRollupBuild: ActiveRollupBuild | null = null;

/**
 * Builds every bundle-producing package sequentially with diagnostics.
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

    await forTime(1000 * 60 * 60 * 0);

    const stopBuildResourceReporter = startBuildResourceReporter();
    const buildablePackages = packagesMetadata.filter(({ isBuilded }) => isBuilded);

    try {
        // Note: Build each package separately to avoid memory issues and improve build reliability
        for (let packageIndex = 0; packageIndex < buildablePackages.length; packageIndex++) {
            const { packageBasename, packageFullname } = buildablePackages[packageIndex];

            console.info(`--- ${packageFullname} ---`);
            console.info(
                colors.blue(`📦 Building package ${packageIndex + 1}/${buildablePackages.length}: ${packageFullname}`),
            );

            await buildPackageBundle(packageBasename, packageFullname);

            console.info(colors.green(`✅ Package ${packageFullname} built successfully`));
        }

        console.info(colors.green('✅✅ All packages built successfully'));
    } finally {
        stopBuildResourceReporter();
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
    const currentActiveRollupBuild = activeRollupBuild;

    if (currentActiveRollupBuild === null) {
        return 'No Rollup subprocess is currently active.';
    }

    return spaceTrim(
        (block) => `
            Package: \`${currentActiveRollupBuild.packageFullname}\`
            Package basename: \`${currentActiveRollupBuild.packageBasename}\`
            PID: ${currentActiveRollupBuild.childPid ?? 'pending'}
            Build runtime: ${formatDurationForLog(now - currentActiveRollupBuild.startedAt)}
            Time since last output: ${formatDurationForLog(now - currentActiveRollupBuild.lastOutputAt)}
            Last lifecycle event: ${currentActiveRollupBuild.lastLifecycleEvent}
            ${block(
                currentActiveRollupBuild.createdAt === null
                    ? `Rollup has not reported the final bundle creation line yet.`
                    : `Time since Rollup reported final bundle creation: ${formatDurationForLog(
                          now - currentActiveRollupBuild.createdAt,
                      )}`,
            )}
        `,
    );
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
        let hangError: UnexpectedError | null = null;
        let healthCheckInterval: NodeJS.Timeout | null = null;
        let forceKillTimeout: NodeJS.Timeout | null = null;

        activeRollupBuild = {
            packageBasename,
            packageFullname,
            startedAt: Date.now(),
            childPid: commandProcess.pid ?? null,
            lastOutputAt: Date.now(),
            createdAt: null,
            lastLifecycleEvent: 'Spawn requested',
        };

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

            activeRollupBuild = null;
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
            if (activeRollupBuild === null) {
                return;
            }

            if (activeRollupBuild.createdAt === null && ROLLUP_CREATED_LINE_REGEX.test(line.trim())) {
                activeRollupBuild.createdAt = Date.now();
                activeRollupBuild.lastLifecycleEvent = 'Rollup reported final bundle creation';

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

            if (activeRollupBuild !== null) {
                activeRollupBuild.lastOutputAt = Date.now();
                activeRollupBuild.lastLifecycleEvent = `Received ${streamName} output`;
            }

            if (streamName === 'stdout') {
                process.stdout.write(outputText);
            } else {
                process.stderr.write(outputText);
            }

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

            if (activeRollupBuild !== null) {
                activeRollupBuild.lastLifecycleEvent = reason;
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

            commandProcess.kill();

            forceKillTimeout = setTimeout(() => {
                if (!commandProcess.killed) {
                    console.error(colors.red(`Force-killing Rollup subprocess PID ${commandProcess.pid ?? 'unknown'}`));
                    commandProcess.kill('SIGKILL');
                }
            }, 5 * 1000);
        }

        healthCheckInterval = setInterval(() => {
            if (activeRollupBuild === null) {
                return;
            }

            const now = Date.now();
            const timeSinceLastOutput = now - activeRollupBuild.lastOutputAt;

            if (
                activeRollupBuild.createdAt !== null &&
                now - activeRollupBuild.createdAt > ROLLUP_EXIT_GRACE_PERIOD_MS
            ) {
                requestTerminationForHang(
                    spaceTrim(`
                        Rollup already printed the final \`created ...\` line
                        but the subprocess did not exit within ${formatDurationForLog(ROLLUP_EXIT_GRACE_PERIOD_MS)}.
                    `),
                );
                return;
            }

            if (timeSinceLastOutput > ROLLUP_NO_OUTPUT_TIMEOUT_MS) {
                requestTerminationForHang(
                    `Rollup produced no output for ${formatDurationForLog(timeSinceLastOutput)}.`,
                );
            }
        }, ROLLUP_HEALTH_CHECK_INTERVAL_MS);

        commandProcess.on('spawn', () => {
            if (activeRollupBuild !== null) {
                activeRollupBuild.childPid = commandProcess.pid ?? null;
                activeRollupBuild.lastLifecycleEvent = 'Rollup subprocess spawned';
            }
        });

        commandProcess.stdout.on('data', (chunk) => {
            handleOutput(chunk, 'stdout');
        });

        commandProcess.stderr.on('data', (chunk) => {
            handleOutput(chunk, 'stderr');
        });

        commandProcess.on('exit', (code, signal) => {
            if (activeRollupBuild !== null) {
                activeRollupBuild.lastLifecycleEvent = `Rollup subprocess exited with code=${code ?? 'null'} signal=${
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
        if (activeRollupBuild !== null) {
            console.error(`📦 Active bundle: ${activeRollupBuild.packageFullname}`);
            console.error(`🆔 Rollup PID: ${activeRollupBuild.childPid ?? 'pending'}`);
            console.error(`🔇 Time since last Rollup output: ${formatDurationForLog(now - activeRollupBuild.lastOutputAt)}`);
            console.error(`🧾 Rollup state: ${activeRollupBuild.lastLifecycleEvent}`);
            if (activeRollupBuild.createdAt !== null) {
                console.error(
                    `🏁 Time since Rollup reported bundle creation: ${formatDurationForLog(
                        now - activeRollupBuild.createdAt,
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
