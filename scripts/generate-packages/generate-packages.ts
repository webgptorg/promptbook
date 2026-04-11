#!/usr/bin/env ts-node
// generate-packages.ts

import { spawn } from 'child_process';
import colors from 'colors';
import commander from 'commander';
import fs, { mkdir, readFile, writeFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import os from 'os';
import { basename, dirname, join, relative } from 'path';
import { spaceTrim } from 'spacetrim';
import type { PackageJson } from 'type-fest';
import { forTime } from 'waitasecond';
import YAML from 'yaml';
import { GENERATOR_WARNING } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';
import { UnexpectedError } from '../../src/errors/UnexpectedError';
import { $execCommand } from '../../src/utils/execCommand/$execCommand';
import { isFileExisting } from '../../src/utils/files/isFileExisting';
import { prettifyMarkdown } from '../../src/utils/markdown/prettifyMarkdown';
import { removeMarkdownComments } from '../../src/utils/markdown/removeMarkdownComments';
import { just } from '../../src/utils/organization/just';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
import type { PackageMetadata } from './PackageMetadata';
import { getPackagesMetadata } from './getPackagesMetadata';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: generate-packages.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

/**
 * Constant for program.
 */
const program = new commander.Command();
program.option('--commit', `Autocommit changes`, false);
program.option('--skip-bundler', `Skip the build process of bundler`, false);
program.parse(process.argv);

/**
 * Constant for { commit: is commited, skip bundler: is bundler skipped }.
 */
const { commit: isCommitted, skipBundler: isBundlerSkipped } = program.opts();

/**
 * If Rollup stays silent for longer than this, treat the build as locally stuck.
 *
 * @private internal utility of package generation
 */
const ROLLUP_NO_OUTPUT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Rollup should exit almost immediately after printing the final `created ...` line.
 *
 * @private internal utility of package generation
 */
const ROLLUP_EXIT_GRACE_PERIOD_MS = 30 * 1000;

/**
 * Interval for checking whether the Rollup subprocess stopped making progress.
 *
 * @private internal utility of package generation
 */
const ROLLUP_HEALTH_CHECK_INTERVAL_MS = 5 * 1000;

/**
 * Matches Rollup's final success line.
 *
 * @private internal utility of package generation
 */
const ROLLUP_CREATED_LINE_REGEX = /^created\s+.+\s+in\s+.+$/i;

/**
 * Packages that should use the more permissive documentation license.
 *
 * @private internal utility of package generation
 */
const RELAXED_LICENSE_PACKAGE_FULLNAMES = new Set(['@promptbook/utils', '@promptbook/markdown-utils']);

/**
 * Packages that are intentionally published without `@promptbook/core` as a peer dependency.
 *
 * @private internal utility of package generation
 */
const PACKAGE_FULLNAMES_WITHOUT_CORE_PEER_DEPENDENCY = new Set([
    '@promptbook/core',
    '@promptbook/utils',
    '@promptbook/cli',
    '@promptbook/markdown-utils',
]);

/**
 * Packages that are allowed to contain code marked as Node-only.
 *
 * @private internal utility of package generation
 */
const NODE_ONLY_PACKAGE_FULLNAMES = new Set([
    '@promptbook/node',
    '@promptbook/cli',
    '@promptbook/wizard',
    '@promptbook/remote-server',
    '@promptbook/documents',
    '@promptbook/legacy-documents',
    '@promptbook/website-crawler',
    '@promptbook/markitdown',
    '@promptbook/pdf',
]);

/**
 * Packages that are allowed to contain code marked as browser-only.
 *
 * @private internal utility of package generation
 */
const BROWSER_ONLY_PACKAGE_FULLNAMES = new Set(['@promptbook/browser', '@promptbook/components']);

/**
 * Shared keyword baseline added to every published package manifest.
 *
 * @private internal utility of package generation
 */
const GENERAL_PACKAGE_KEYWORDS = [
    'ai',
    'llm',
    'prompt',
    'template',
    'language-model',
    'machine-learning',
    'natural-language-processing',
    'nlp',
    'ai-orchestration',
    'prompt-engineering',
    'llmops',
    'multimodal',
    'reasoning',
    'rag',
    'embeddings',
    'function-calling',
    'large-language-models',
    'ai-application-framework',
    'text-generation',
    'ai-agents',
    'book-language',
    'markdown-dsl',
    'ai-workflow',
    'ai-automation',
    'pipeline',
    'workflow',
    'orchestration',
    'ai-pipeline',
    'prompt-template',
    'prompt-chaining',
    'ai-scripting',
    'conversational-ai',
    'chatbot',
    'ai-assistant',
    'knowledge-base',
    'typescript',
    'javascript',
    'nodejs',
    'browser',
    'cross-platform',
    'api-integration',
    'model-agnostic',
    'multi-model',
    'ai-sdk',
    'ai-framework',
    'ai-platform',
    'generative-ai',
    'content-generation',
    'text-processing',
    'natural-language',
    'human-readable',
    'plain-english',
    'automation-framework',
    'workflow-engine',
    'task-automation',
    'ai-ops',
    'mlops',
    'developer-tools',
    'ai-development',
    'prompt-management',
    'unified-interface',
    'cross-provider',
    'vendor-agnostic',
] as const;

/**
 * Package-name fragments mapped to extra keywords for package metadata generation.
 *
 * @private internal utility of package generation
 */
const PACKAGE_KEYWORD_RULES = [
    {
        fragment: 'openai',
        keywords: ['openai', 'gpt-3', 'gpt-4', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3', 'o3-mini', 'chatgpt'],
    },
    {
        fragment: 'anthropic',
        keywords: ['anthropic', 'claude', 'claude-3', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    },
    { fragment: 'google', keywords: ['google', 'gemini', 'gemini-pro', 'gemini-flash'] },
    { fragment: 'deepseek', keywords: ['deepseek'] },
    { fragment: 'ollama', keywords: ['ollama', 'local-llm', 'self-hosted'] },
    { fragment: 'azure', keywords: ['azure', 'azure-openai', 'microsoft'] },
    { fragment: 'vercel', keywords: ['vercel', 'vercel-ai', 'edge-functions'] },
    { fragment: 'cli', keywords: ['cli', 'cli-tool', 'command-line', 'terminal', 'automation'] },
    { fragment: 'browser', keywords: ['browser', 'web', 'client-side', 'frontend'] },
    { fragment: 'node', keywords: ['nodejs', 'server-side', 'backend'] },
    { fragment: 'remote', keywords: ['remote-execution', 'distributed', 'cloud', 'server'] },
    { fragment: 'types', keywords: ['typescript', 'types', 'type-definitions', 'intellisense'] },
    { fragment: 'utils', keywords: ['utilities', 'helpers', 'tools', 'preprocessing', 'postprocessing'] },
    { fragment: 'markdown', keywords: ['markdown', 'markdown-processing', 'text-processing'] },
    { fragment: 'pdf', keywords: ['pdf', 'pdf-processing', 'document-processing'] },
    { fragment: 'documents', keywords: ['document-processing', 'docx', 'odt', 'office-documents'] },
    { fragment: 'website-crawler', keywords: ['web-scraping', 'website-crawler', 'scraping', 'crawling'] },
    { fragment: 'fake-llm', keywords: ['testing', 'mocking', 'fake', 'mock-llm', 'development'] },
    { fragment: 'wizard', keywords: ['wizard', 'setup', 'configuration', 'getting-started'] },
    { fragment: 'javascript', keywords: ['javascript', 'js', 'scripting', 'execution'] },
    { fragment: 'editable', keywords: ['editable', 'dynamic', 'runtime', 'imperative'] },
    { fragment: 'templates', keywords: ['templates', 'examples', 'boilerplate', 'starter'] },
] as const;

/**
 * Runtime diagnostics for the currently running Rollup build.
 *
 * @private internal utility of package generation
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
 * @private internal utility of package generation
 */
let activeRollupBuild: ActiveRollupBuild | null = null;

/**
 * Runtime options supported by the package-generation entrypoint.
 *
 * @private internal utility of package generation
 */
type GeneratePackagesOptions = {
    readonly isCommitted: boolean;
    readonly isBundlerSkipped: boolean;
};

/**
 * Shared data prepared once and reused across generation phases.
 *
 * @private internal utility of package generation
 */
type PackageGenerationContext = {
    readonly allDependencies: Record<string, string>;
    readonly mainPackageJson: PackageJson;
    readonly mainPackageVersion: string;
    readonly packagesMetadata: ReadonlyArray<PackageMetadata>;
};

generatePackages({ isCommitted, isBundlerSkipped })
    .catch((error) => {
        assertsError(error);
        console.error(colors.bgRed(`${error.name} in ${basename(__filename)}`));
        console.error(colors.red(error.stack || error.message));
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });

/**
 * Formats a duration for human-readable diagnostic logging.
 *
 * @param durationMs - Duration in milliseconds
 * @returns Human-readable duration string
 *
 * @private internal utility of package generation
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
 *
 * @private internal utility of package generation
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
 *
 * @private internal utility of package generation
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
 * Generates all package files and bundles used in the monorepo.
 *
 * @param options - Package generation options
 *
 * @private internal utility of package generation
 */
async function generatePackages({ isCommitted, isBundlerSkipped }: GeneratePackagesOptions): Promise<void> {
    console.info(`📦  Generating packages`);

    await assertPackageGenerationWorkingTreeState(isCommitted);

    const packageGenerationContext = await preparePackageGenerationContext();

    await generatePackageEntryFiles(packageGenerationContext.packagesMetadata);
    await generatePackageReadmesAndMetadata(packageGenerationContext);
    await cleanupPackageBuildDirectories(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await buildGeneratedPackageBundles(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await postprocessGeneratedBundles(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await assertGeneratedBundlesArePublishSafe(packageGenerationContext.packagesMetadata, isBundlerSkipped);
    await addDependenciesForGeneratedPackages(packageGenerationContext);
    await maybeCopyAgentsServerAppToCliPackage();
    await writePublishWorkflow(packageGenerationContext.packagesMetadata);
    await maybeCommitGeneratedPackages(isCommitted, packageGenerationContext.mainPackageVersion);
}

/**
 * Ensures `--commit` only runs against a clean repository state.
 *
 * @param isCommitted - Whether package generation should auto-commit the result
 *
 * @private internal utility of package generation
 */
async function assertPackageGenerationWorkingTreeState(isCommitted: boolean): Promise<void> {
    if (isCommitted && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }
}

/**
 * Loads package metadata and root package information shared across all later phases.
 *
 * @returns Prepared generation context
 *
 * @private internal utility of package generation
 */
async function preparePackageGenerationContext(): Promise<PackageGenerationContext> {
    logPackageGenerationStep(`0️⃣  Prepare the needed information about the packages`);

    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    console.info(`Promptbook version ${mainPackageJson.version}`);

    const mainPackageVersion = getRequiredMainPackageVersion(mainPackageJson);
    const allDependencies = collectMainPackageDependencies(mainPackageJson);
    const packagesMetadata = await getPackagesMetadata();

    return {
        allDependencies,
        mainPackageJson,
        mainPackageVersion,
        packagesMetadata,
    };
}

/**
 * Verifies that the root package manifest contains a version string.
 *
 * @param mainPackageJson - Parsed root package manifest
 * @returns Required version string
 *
 * @private internal utility of package generation
 */
function getRequiredMainPackageVersion(mainPackageJson: PackageJson): string {
    if (!mainPackageJson.version) {
        throw new Error(`Version is not defined in the package.json`);
    }

    return mainPackageJson.version;
}

/**
 * Collects dependency versions that generated packages may inherit from the root manifest.
 *
 * @param mainPackageJson - Parsed root package manifest
 * @returns Dependency name-to-version map
 *
 * @private internal utility of package generation
 */
function collectMainPackageDependencies(mainPackageJson: PackageJson): Record<string, string> {
    const allDependencies: Record<string, string> = {};

    for (const [dependencyName, dependencyVersion] of Object.entries(mainPackageJson.dependencies || {})) {
        if (dependencyVersion !== undefined) {
            allDependencies[dependencyName] = dependencyVersion;
        }
    }

    return allDependencies;
    // <- TODO: Maybe add `devDependencies` and check collisions between `dependencies` and `devDependencies`
}

/**
 * Generates the aggregate entry file for every package that publishes one.
 *
 * @param packagesMetadata - Metadata of generated packages
 *
 * @private internal utility of package generation
 */
async function generatePackageEntryFiles(packagesMetadata: ReadonlyArray<PackageMetadata>): Promise<void> {
    logPackageGenerationStep(`1️⃣  Generate entry file for each package`);

    for (const packageMetadata of packagesMetadata) {
        await generatePackageEntryFile(packageMetadata);
    }
}

/**
 * Generates the aggregate entry file for a single package.
 *
 * @param packageMetadata - Metadata of the generated package
 *
 * @private internal utility of package generation
 */
async function generatePackageEntryFile(packageMetadata: PackageMetadata): Promise<void> {
    const { entryIndexFilePath, entities, packageFullname } = packageMetadata;

    if (entryIndexFilePath === null) {
        return;
    }

    if (entities === undefined) {
        throw new Error(`Entities are not defined for ${packageMetadata.packageFullname}`);
    }

    const entryIndexFilePathContent = `${createPackageEntryFileContent(entryIndexFilePath, packageFullname, entities)}\n`;

    // TODO: `entryIndexFilePathContent = await prettifyTypeScript(entryIndexFilePathContent)`

    await writeFile(entryIndexFilePath, entryIndexFilePathContent, 'utf-8');
    console.info(colors.green('Generated index file ' + entryIndexFilePath.split('\\').join('/')));
}

/**
 * Renders the generated entry file content for one package.
 *
 * @param entryIndexFilePath - Generated index file path
 * @param packageFullname - Full package name
 * @param entities - Exported entities for the package
 * @returns TypeScript source for the entry file
 *
 * @private internal utility of package generation
 */
function createPackageEntryFileContent(
    entryIndexFilePath: string,
    packageFullname: string,
    entities: NonNullable<PackageMetadata['entities']>,
): string {
    const entryIndexFilePathContentImports: Array<string> = [];
    const entryIndexFilePathContentExports: Array<string> = [];

    for (const entity of entities) {
        const { filename, name } = entity;
        const isType = shouldExportEntityAsType(packageFullname, entity.isType);
        const importPath = resolveEntryImportPath(entryIndexFilePath, filename);
        const typePrefix = isType ? ' type' : '';

        entryIndexFilePathContentImports.push(`import${typePrefix} { ${name} } from '${importPath}';`);
        entryIndexFilePathContentExports.push(`export${typePrefix} { ${name} };`);
    }

    if (packageFullname === '@promptbook/types') {
        return spaceTrim(
            (block) => `
                // ${block(GENERATOR_WARNING)}
                // \`${packageFullname}\`

                ${block(entryIndexFilePathContentImports.join('\n'))}

                // Note: Entities of the \`${packageFullname}\`
                ${block(entryIndexFilePathContentExports.join('\n'))}
            `,
        );
    }

    const useClientDirective = packageFullname === '@promptbook/components' ? "'use client';" : '';

    return spaceTrim(
        (block) => `
            ${useClientDirective}

            // ${block(
                GENERATOR_WARNING /* <- TODO: !!!! Make function getGeneratorWarning and always pass the generator file + instructions for AI */,
            )}
            // \`${packageFullname}\`

            import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
            ${block(entryIndexFilePathContentImports.join('\n'))}


            // Note: Exporting version from each package
            export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


            // Note: Entities of the \`${packageFullname}\`
            ${block(entryIndexFilePathContentExports.join('\n'))}
        `,
    );
}

/**
 * Determines whether an exported entity should use type-only syntax in generated package entrypoints.
 *
 * @param packageFullname - Full package name
 * @param isType - Whether the entity itself is typed as a type-only export
 * @returns Whether the entity should be imported and exported as a type
 *
 * @private internal utility of package generation
 */
function shouldExportEntityAsType(packageFullname: string, isType: boolean): boolean {
    if (packageFullname === '@promptbook/types') {
        return true;
    }

    return isType;
}

/**
 * Resolves the relative import path from a generated entry file to the source entity.
 *
 * @param entryIndexFilePath - Generated index file path
 * @param filename - Source entity file path
 * @returns Normalized import path without a file extension
 *
 * @private internal utility of package generation
 */
function resolveEntryImportPath(entryIndexFilePath: string, filename: string): string {
    let importPath = `${relative(dirname(entryIndexFilePath), filename).split('\\').join('/')}`;

    if (!importPath.startsWith('.')) {
        importPath = './' + importPath;
    }

    if (importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
        importPath = importPath.replace(/\.(ts|tsx)$/, '');
    }

    return importPath;
}

/**
 * Generates README files, package manifests, and ignore files for every package.
 *
 * @param packageGenerationContext - Prepared generation context
 *
 * @private internal utility of package generation
 */
async function generatePackageReadmesAndMetadata(
    packageGenerationContext: PackageGenerationContext,
): Promise<void> {
    logPackageGenerationStep(`2️⃣  Generate package.json, README and other crucial files for each package`);

    const mainReadme = await readFile('./README.md', 'utf-8');

    for (const packageMetadata of packageGenerationContext.packagesMetadata) {
        await generatePackageReadmeAndMetadata(packageMetadata, packageGenerationContext.mainPackageJson, mainReadme);
    }
}

/**
 * Generates README, package manifest, and ignore files for one package.
 *
 * @param packageMetadata - Metadata of the generated package
 * @param mainPackageJson - Root package manifest used as a template
 * @param mainReadme - Root README content used as a base
 *
 * @private internal utility of package generation
 */
async function generatePackageReadmeAndMetadata(
    packageMetadata: PackageMetadata,
    mainPackageJson: PackageJson,
    mainReadme: string,
): Promise<void> {
    const { isBuilded, packageBasename, packageFullname, readmeFilePath } = packageMetadata;
    const packageReadmeExtra = await readFile(readmeFilePath, 'utf-8');
    const packageReadme = createPackageReadme(mainReadme, packageReadmeExtra, packageFullname, isBuilded, mainPackageJson);
    const packageJson = createGeneratedPackageJson(mainPackageJson, packageFullname);

    packageJson.keywords = createPackageKeywords(packageFullname);

    await mkdir(`./packages/${packageBasename}`, { recursive: true });
    await writeFile(`./packages/${packageBasename}/README.md`, packageReadme);
    await writeGeneratedPackageJson(packageBasename, packageJson);

    if (isBuilded) {
        await writeGeneratedPackageIgnoreFiles(packageBasename);
    }
}

/**
 * Creates the README published with one package.
 *
 * @param mainReadme - Root README content used as a base
 * @param packageReadmeExtra - Package-specific README fragment
 * @param packageFullname - Full package name
 * @param isBuilded - Whether this package is built and should receive package-specific docs
 * @param mainPackageJson - Root package manifest
 * @returns Generated README content
 *
 * @private internal utility of package generation
 */
function createPackageReadme(
    mainReadme: string,
    packageReadmeExtra: string,
    packageFullname: string,
    isBuilded: boolean,
    mainPackageJson: PackageJson,
): string {
    let packageReadme = mainReadme;
    const installCommand = createPackageInstallCommand(packageFullname);
    const prereleaseWarning = createPackagePrereleaseWarning(mainPackageJson);
    const packageReadmeFullextra = spaceTrim(
        (block) => `

              ${block(prereleaseWarning)}

              ## 📦 Package \`${packageFullname}\`

              - Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
              - This package \`${packageFullname}\` is one part of the promptbook ecosystem.

              To install this package, run:

              \`\`\`bash
              # Install entire promptbook ecosystem
              npm i ptbk

              ${block(installCommand)}
              \`\`\`

              ${block(packageReadmeExtra)}

              ---

              Rest of the documentation is common for **entire promptbook ecosystem**:
        `,
    );

    if (isBuilded /* [🚘] */) {
        packageReadme = packageReadme
            .split(`<!--/ Here will be placed specific package info -->`)
            .join(packageReadmeFullextra);
    }

    // TODO: [🍓] Convert mermaid diagrams to images or remove them from the markdown published to NPM
    packageReadme = removeMarkdownComments(packageReadme);
    packageReadme = spaceTrim(
        (block) => `
            <!-- ${block(GENERATOR_WARNING)} -->

            ${block(packageReadme)}
        `,
    );
    prettifyMarkdown(packageReadme);

    return packageReadme;
}

/**
 * Renders the package-specific installation snippet used in generated READMEs.
 *
 * @param packageFullname - Full package name
 * @returns Markdown installation snippet
 *
 * @private internal utility of package generation
 */
function createPackageInstallCommand(packageFullname: string): string {
    if (packageFullname === '@promptbook/cli') {
        return spaceTrim(`

            # Install as dev dependency
            npm install --save-dev ${packageFullname}

            # Or install globally
            npm install --global ${packageFullname}

        `);
    }

    if (packageFullname === '@promptbook/types') {
        return `npm i -D ${packageFullname}`;
    }

    return spaceTrim(`

        # Install just this package to save space
        npm install ${packageFullname}

    `);
}

/**
 * Generates the prerelease warning block for package READMEs when needed.
 *
 * @param mainPackageJson - Root package manifest
 * @returns HTML warning block or an empty string
 *
 * @private internal utility of package generation
 */
function createPackagePrereleaseWarning(mainPackageJson: PackageJson): string {
    if (!mainPackageJson.version?.includes('-')) {
        return '';
    }

    return spaceTrim(`
        <blockquote style="color: #ff8811">
            <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
        </blockquote>
    `);
    // TODO: Link latest stable release automatically
}

/**
 * Creates the initial package manifest before dependency inference and bundler-specific fields.
 *
 * @param mainPackageJson - Root package manifest used as a template
 * @param packageFullname - Full package name
 * @returns Generated package manifest
 *
 * @private internal utility of package generation
 */
function createGeneratedPackageJson(mainPackageJson: PackageJson, packageFullname: string): PackageJson {
    const packageJson = JSON.parse(JSON.stringify(mainPackageJson) /* <- Note: Make deep copy */) as PackageJson;

    delete packageJson.scripts;
    delete packageJson.funding;
    delete packageJson.dependencies;
    delete packageJson.devDependencies;
    delete packageJson.peerDependencies;

    for (const key of Object.keys(packageJson)) {
        if (key.startsWith('--')) {
            delete packageJson[key];
        }
    }

    packageJson.license = RELAXED_LICENSE_PACKAGE_FULLNAMES.has(packageFullname) ? 'CC-BY-4.0' : 'BUSL-1.1';
    packageJson.name = packageFullname;

    return packageJson;
}

/**
 * Creates the keyword list for one generated package manifest.
 *
 * @param packageFullname - Full package name
 * @returns Sorted unique keyword list
 *
 * @private internal utility of package generation
 */
function createPackageKeywords(packageFullname: string): Array<string> {
    const dynamicKeywords: Array<string> = [];

    for (const { fragment, keywords } of PACKAGE_KEYWORD_RULES) {
        if (packageFullname.includes(fragment)) {
            dynamicKeywords.push(...keywords);
        }
    }

    return [...new Set([...GENERAL_PACKAGE_KEYWORDS, ...dynamicKeywords])].sort();
}

/**
 * Writes package ignore files that accompany buildable packages.
 *
 * @param packageBasename - Basename of the generated package
 *
 * @private internal utility of package generation
 */
async function writeGeneratedPackageIgnoreFiles(packageBasename: string): Promise<void> {
    await writeFile(`./packages/${packageBasename}/.gitignore`, ['esm', 'umd', 'apps'].join('\n'));
    await writeFile(
        `./packages/${packageBasename}/.npmignore`,
        spaceTrim(`
            # ${GENERATOR_WARNING}

            stats.html
        `),
    );
}

/**
 * Removes old bundle directories before running Rollup again.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 *
 * @private internal utility of package generation
 */
async function cleanupPackageBuildDirectories(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`3️⃣  Cleanup build directories for each package`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the cleanup for bundler`));
        return;
    }

    for (const { isBuilded, packageBasename } of packagesMetadata) {
        if (!isBuilded) {
            continue;
        }

        await $execCommand(`rm -rf ./packages/${packageBasename}/umd`);
        await $execCommand(`rm -rf ./packages/${packageBasename}/esm`);
    }
}

/**
 * Builds every bundle-producing package sequentially with diagnostics.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 *
 * @private internal utility of package generation
 */
async function buildGeneratedPackageBundles(
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
 * Starts the periodic resource logger used while Rollup builds are running.
 *
 * @returns Cleanup callback that stops the reporter
 *
 * @private internal utility of package generation
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

/**
 * Performs the small cleanup pass applied after successful bundling.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 *
 * @private internal utility of package generation
 */
async function postprocessGeneratedBundles(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`5️⃣  Postprocess the generated bundle`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping postprocessing`));
        return;
    }

    // Note: Keep `typings` only from `esm` (and remove `umd`)
    for (const { packageBasename } of packagesMetadata) {
        await $execCommand(`rm -rf ./packages/${packageBasename}/umd/typings`);
    }
}

/**
 * Finds the first occurrence of a marker in file content and returns formatted line information.
 *
 * @param fileContent - The content of the file to search
 * @param marker - The marker to search for (e.g. `[🟢]`, `[⚪]`)
 * @returns Formatted string with line number and content, or empty string if marker is not found
 *
 * @private internal utility of package generation
 */
function findMarkerLine(fileContent: string, marker: string): string {
    const lines = fileContent.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (lines[lineIndex].includes(marker)) {
            const lineNumber = lineIndex + 1;
            const lineContent = lines[lineIndex].trim();

            return spaceTrim(`

                In line ${lineNumber}:
                ${lineContent}
            `);
        }
    }

    return '';
}

/**
 * Verifies that generated bundle contents do not leak non-publishable code markers.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 *
 * @private internal utility of package generation
 */
async function assertGeneratedBundlesArePublishSafe(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`6️⃣  Test that nothing what should not be published is published`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler, skipping the tests for bundle content`));
        return;
    }

    for (const packageMetadata of packagesMetadata) {
        await assertPackageBundleIsPublishSafe(packageMetadata);
    }
}

/**
 * Validates all emitted files for one generated package.
 *
 * @param packageMetadata - Metadata of the generated package
 *
 * @private internal utility of package generation
 */
async function assertPackageBundleIsPublishSafe(packageMetadata: PackageMetadata): Promise<void> {
    const { packageBasename, packageFullname } = packageMetadata;
    const bundleFileNames = await glob(`./packages/${packageBasename}/**/*`, { nodir: true });

    for (const bundleFileName of bundleFileNames) {
        if (shouldSkipBundleContentCheck(bundleFileName)) {
            continue;
        }

        const bundleFileContent = await readFile(bundleFileName, 'utf-8');

        assertBundleFileDoesNotContainNeverPublishMarker(bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainReleasedPackageMarker(bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainCliOnlyMarkerOutsideCli(packageFullname, bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainNodeOnlyMarkerOutsideNodePackages(
            packageFullname,
            bundleFileName,
            bundleFileContent,
        );
        assertBundleFileDoesNotContainBrowserOnlyMarkerOutsideBrowserPackages(
            packageFullname,
            bundleFileName,
            bundleFileContent,
        );
    }
}

/**
 * Determines whether a generated file should be excluded from marker scanning.
 *
 * @param bundleFileName - Generated bundle file path
 * @returns Whether the file should be skipped
 *
 * @private internal utility of package generation
 */
function shouldSkipBundleContentCheck(bundleFileName: string): boolean {
    return bundleFileName.includes('/typings/') || bundleFileName.endsWith('.d.ts');
    // <- TODO: Maybe exclude "typings" directly in glob
}

/**
 * Ensures a generated bundle file does not contain the repository-private marker.
 *
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 *
 * @private internal utility of package generation
 */
function assertBundleFileDoesNotContainNeverPublishMarker(bundleFileName: string, bundleFileContent: string): void {
    if (!bundleFileContent.includes('[⚫]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [⚫] should never be never released in the bundle

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[⚫]'))}
            `,
        ),
    );
}

/**
 * Ensures a generated bundle file does not contain the released-package marker.
 *
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 *
 * @private internal utility of package generation
 */
function assertBundleFileDoesNotContainReleasedPackageMarker(
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (!bundleFileContent.includes('[⚪]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [⚪] should never be in a released package.

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[⚪]'))}
            `,
        ),
    );
}

/**
 * Ensures CLI-only code markers never leak into non-CLI packages.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 *
 * @private internal utility of package generation
 */
function assertBundleFileDoesNotContainCliOnlyMarkerOutsideCli(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (packageFullname === '@promptbook/cli' || !bundleFileContent.includes('[🟡]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🟡] should never be never released out of @promptbook/cli

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[🟡]'))}
            `,
        ),
    );
}

/**
 * Ensures Node-only code markers never leak into packages that can run in browser-like environments.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 *
 * @private internal utility of package generation
 */
function assertBundleFileDoesNotContainNodeOnlyMarkerOutsideNodePackages(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (NODE_ONLY_PACKAGE_FULLNAMES.has(packageFullname) || !bundleFileContent.includes('[🟢]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🟢] should never be never released in packages that could be imported into browser environment

                But found in package \`${packageFullname}\`

                Analyze the issue in the bundle file:
                ${block(bundleFileName)}
                <- Search for [🟢] marker
                ${block(findMarkerLine(bundleFileContent, '[🟢]'))}
            `,
        ),
    );
}

/**
 * Ensures browser-only code markers never leak into non-browser packages.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 *
 * @private internal utility of package generation
 */
function assertBundleFileDoesNotContainBrowserOnlyMarkerOutsideBrowserPackages(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (BROWSER_ONLY_PACKAGE_FULLNAMES.has(packageFullname) || !bundleFileContent.includes('[🔵]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🔵] should never be never released out of @promptbook/browser

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[🔵]'))}
            `,
        ),
    );
}

/**
 * Finalizes package manifests with dependencies and executable metadata.
 *
 * @param packageGenerationContext - Prepared generation context
 *
 * @private internal utility of package generation
 */
async function addDependenciesForGeneratedPackages(
    packageGenerationContext: PackageGenerationContext,
): Promise<void> {
    logPackageGenerationStep(`7️⃣  Add dependencies for each package`);

    const { allDependencies, mainPackageVersion, packagesMetadata } = packageGenerationContext;

    for (const packageMetadata of packagesMetadata) {
        const packageJson = await readGeneratedPackageJson(packageMetadata.packageBasename);

        applyGeneratedPackageEntrypoints(packageJson, packageMetadata);
        applyGeneratedPackagePeerDependencies(packageJson, packageMetadata.packageFullname, mainPackageVersion);
        await applyDetectedBundleDependencies(packageJson, packageMetadata, allDependencies);
        applyAdditionalPackageDependencies(packageJson, packageMetadata.additionalDependencies, mainPackageVersion);
        applyGeneratedPackageBin(packageJson, packageMetadata.packageFullname);
        removeReactRuntimeDependenciesFromComponents(packageJson, packageMetadata.packageFullname);

        await writeGeneratedPackageJson(packageMetadata.packageBasename, packageJson);
    }
}

/**
 * Reads a generated package manifest from disk.
 *
 * @param packageBasename - Basename of the generated package
 * @returns Parsed package manifest
 *
 * @private internal utility of package generation
 */
async function readGeneratedPackageJson(packageBasename: string): Promise<PackageJson> {
    return JSON.parse(await readFile(`./packages/${packageBasename}/package.json`, 'utf-8')) as PackageJson;
}

/**
 * Writes a generated package manifest to disk using the repository formatting convention.
 *
 * @param packageBasename - Basename of the generated package
 * @param packageJson - Package manifest to write
 *
 * @private internal utility of package generation
 */
async function writeGeneratedPackageJson(packageBasename: string, packageJson: PackageJson): Promise<void> {
    await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
    // <- TODO: Add GENERATOR_WARNING to package.json
    // <- TODO: [0] package.json is is written twice, can it be done in one step?
}

/**
 * Adds `main`, `module`, and `typings` fields where the generated package layout requires them.
 *
 * @param packageJson - Generated package manifest
 * @param packageMetadata - Metadata of the generated package
 *
 * @private internal utility of package generation
 */
function applyGeneratedPackageEntrypoints(packageJson: PackageJson, packageMetadata: PackageMetadata): void {
    const { isBuilded, packageBasename, packageFullname } = packageMetadata;

    if (!isBuilded || packageFullname === '@promptbook/cli') {
        return;
    }

    if (packageFullname !== '@promptbook/types') {
        packageJson.main = `./umd/index.umd.js`;
        packageJson.module = `./esm/index.es.js`;
    }

    packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
}

/**
 * Adds the peer dependency contract for one generated package.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 * @param mainPackageVersion - Shared Promptbook version
 *
 * @private internal utility of package generation
 */
function applyGeneratedPackagePeerDependencies(
    packageJson: PackageJson,
    packageFullname: string,
    mainPackageVersion: string,
): void {
    if (packageFullname === '@promptbook/components') {
        // React component library should rely on host app React versions
        packageJson.peerDependencies = {
            react: '>=17.0.0',
            'react-dom': '>=17.0.0',
        };

        // Ensure no hard dependency on React to avoid duplicate installs/bundles
        delete packageJson.dependencies;
        return;
    }

    if (PACKAGE_FULLNAMES_WITHOUT_CORE_PEER_DEPENDENCY.has(packageFullname)) {
        return;
    }

    packageJson.peerDependencies = {
        '@promptbook/core': mainPackageVersion,
    };
}

/**
 * Adds runtime dependencies discovered from the emitted ESM bundle.
 *
 * @param packageJson - Generated package manifest
 * @param packageMetadata - Metadata of the generated package
 * @param allDependencies - Dependency name-to-version map from the root manifest
 *
 * @private internal utility of package generation
 */
async function applyDetectedBundleDependencies(
    packageJson: PackageJson,
    packageMetadata: PackageMetadata,
    allDependencies: Record<string, string>,
): Promise<void> {
    if (!packageMetadata.isBuilded) {
        return;
    }

    const detectedDependencies = await detectBundleDependencies(packageMetadata.packageBasename, allDependencies);

    for (const [dependencyName, dependencyVersion] of Object.entries(detectedDependencies)) {
        upsertPackageDependency(packageJson, dependencyName, dependencyVersion);
    }
}

/**
 * Detects runtime dependencies by scanning a generated ESM bundle.
 *
 * @param packageBasename - Basename of the generated package
 * @param allDependencies - Dependency name-to-version map from the root manifest
 * @returns Dependency name-to-version map referenced by the bundle
 *
 * @private internal utility of package generation
 */
async function detectBundleDependencies(
    packageBasename: string,
    allDependencies: Record<string, string>,
): Promise<Record<string, string>> {
    const bundleName = `./packages/${packageBasename}/esm/index.es.js`;
    let indexContent = '';

    if (await isFileExisting(bundleName, fs)) {
        indexContent = await readFile(bundleName, 'utf-8');
    } else {
        console.warn(colors.yellow(`Bundle file ${bundleName} does not exist`));
    }

    const detectedDependencies: Record<string, string> = {};

    for (const [dependencyName, dependencyVersion] of Object.entries(allDependencies)) {
        if (bundleReferencesDependency(indexContent, dependencyName)) {
            detectedDependencies[dependencyName] = dependencyVersion;
        }
    }

    return detectedDependencies;
}

/**
 * Checks whether a generated bundle references a specific dependency.
 *
 * @param bundleContent - Generated bundle content
 * @param dependencyName - Dependency name to search for
 * @returns Whether the bundle references the dependency
 *
 * @private internal utility of package generation
 */
function bundleReferencesDependency(bundleContent: string, dependencyName: string): boolean {
    return (
        bundleContent.includes(`from '${dependencyName}'`) ||
        bundleContent.includes(`require('${dependencyName}')`) ||
        bundleContent.includes(`require("${dependencyName}")`) ||
        bundleContent.includes(`import('${dependencyName}')`) ||
        bundleContent.includes(`import("${dependencyName}")`)
    );
}

/**
 * Adds explicitly declared package-to-package dependencies.
 *
 * @param packageJson - Generated package manifest
 * @param additionalDependencies - Additional Promptbook package dependencies
 * @param mainPackageVersion - Shared Promptbook version
 *
 * @private internal utility of package generation
 */
function applyAdditionalPackageDependencies(
    packageJson: PackageJson,
    additionalDependencies: ReadonlyArray<string>,
    mainPackageVersion: string,
): void {
    for (const dependencyName of additionalDependencies) {
        upsertPackageDependency(packageJson, dependencyName, mainPackageVersion);
    }
}

/**
 * Adds or updates one generated package dependency entry.
 *
 * @param packageJson - Generated package manifest
 * @param dependencyName - Dependency name
 * @param dependencyVersion - Dependency version
 *
 * @private internal utility of package generation
 */
function upsertPackageDependency(packageJson: PackageJson, dependencyName: string, dependencyVersion: string): void {
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies[dependencyName] = dependencyVersion;
    // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
}

/**
 * Adds executable metadata to CLI-flavored generated packages.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 *
 * @private internal utility of package generation
 */
function applyGeneratedPackageBin(packageJson: PackageJson, packageFullname: string): void {
    if (packageFullname === '@promptbook/cli') {
        packageJson.bin = {
            promptbook: 'bin/promptbook-cli.js',
            ptbk: 'bin/promptbook-cli.js',
            book: 'bin/promptbook-cli.js',
            bk: 'bin/promptbook-cli.js',
            // <- TODO: [🧠] Pick one of and remove rest
        };
        return;
    }

    if (packageFullname === 'ptbk') {
        packageJson.bin = {
            ptbk: 'bin/promptbook-cli-proxy.js',
        };
    }
}

/**
 * Removes React runtime dependencies from the generated component package after inference.
 *
 * @param packageJson - Generated package manifest
 * @param packageFullname - Full package name
 *
 * @private internal utility of package generation
 */
function removeReactRuntimeDependenciesFromComponents(packageJson: PackageJson, packageFullname: string): void {
    if (packageFullname !== '@promptbook/components' || packageJson.dependencies === undefined) {
        return;
    }

    delete packageJson.dependencies['react'];
    delete packageJson.dependencies['react-dom'];

    if (Object.keys(packageJson.dependencies).length === 0) {
        delete packageJson.dependencies;
    }
}

/**
 * Copies the Agents Server app into the CLI package when that distribution path is re-enabled.
 *
 * @private internal utility of package generation
 */
async function maybeCopyAgentsServerAppToCliPackage(): Promise<void> {
    if (!just(false /* <- Note: Temporarily disable the Copy agents-server app */)) {
        return;
    }

    logPackageGenerationStep(`8️⃣  Copy agents-server app to CLI package`);

    const agentsServerSourcePath = './apps/agents-server';
    const agentsServerDestPath = './packages/cli/apps/agents-server';

    console.info(`Copying ${agentsServerSourcePath} to ${agentsServerDestPath}`);

    await $execCommand(`rm -rf ${agentsServerDestPath}`);
    await mkdir(agentsServerDestPath, { recursive: true });
    await $execCommand(`cp -r ${agentsServerSourcePath}/* ${agentsServerDestPath}/ || true`);
    await $execCommand(`rm -rf ${agentsServerDestPath}/.next`);

    console.info(colors.green('Agents-server app copied successfully'));
}

/**
 * Regenerates the package-publishing GitHub Actions workflow.
 *
 * @param packagesMetadata - Metadata of generated packages
 *
 * @private internal utility of package generation
 */
async function writePublishWorkflow(packagesMetadata: ReadonlyArray<PackageMetadata>): Promise<void> {
    logPackageGenerationStep(`9️⃣  Make publishing instructions for Github Actions`);

    await writeFile(`./.github/workflows/publish.yml`, createPublishWorkflowFileContent(packagesMetadata));
    // <- Note: All changes affects up to version folowing the next one, so it is safe to run "🏭📦 Generate packages" script to affect the next version
}

/**
 * Creates the generated `publish.yml` workflow file content.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @returns YAML workflow file content prefixed by the generator warning
 *
 * @private internal utility of package generation
 */
function createPublishWorkflowFileContent(packagesMetadata: ReadonlyArray<PackageMetadata>): string {
    const testSteps = createPublishWorkflowTestSteps();
    const makeSteps = createPublishWorkflowMakeSteps();

    return (
        '# ' +
        GENERATOR_WARNING +
        '\n' +
        YAML.stringify(
            {
                name: '🔼 Publish new version',
                on: {
                    push: {
                        tags: ['v*'],
                    },
                },
                jobs: {
                    'publish-npm': {
                        name: 'Publish on NPM package registry',
                        'runs-on': 'ubuntu-latest',
                        'timeout-minutes': 120,
                        // <- Note: The bundler can take a long time, so we need to set a higher timeout
                        permissions: {
                            contents: 'read',
                            'id-token': 'write',
                            // <- Note: Permissions are required with provenance statement @see https://docs.npmjs.com/generating-provenance-statements
                        },
                        steps: [
                            {
                                name: '🔽 Checkout',
                                uses: 'actions/checkout@v4',
                            },
                            {
                                name: '🔽 Setup Node.js',
                                uses: 'actions/setup-node@v4',
                                with: {
                                    'node-version': 22,
                                    'registry-url': 'https://registry.npmjs.org/',
                                },
                            },
                            {
                                name: '🔍 Debug Node & npm version',
                                run: spaceTrim(`
                                    node -v
                                    npm -v
                                `),
                            },
                            {
                                name: '🔽 Install dependencies',
                                run: 'npm ci',
                            },
                            {
                                name: '🔽 Clone book submodule',
                                run: 'git submodule update --init --recursive',
                            },
                            ...testSteps,
                            ...makeSteps,
                            ...packagesMetadata.map(({ packageBasename, packageFullname }) => ({
                                name: `🔼 Publish ${packageFullname}`,
                                'working-directory': `./packages/${packageBasename}`,
                                run: 'npm publish --provenance --access public',
                                env: {
                                    NODE_AUTH_TOKEN: '${{secrets.NPM_TOKEN}}',
                                },
                            })),
                        ],
                    },
                    // TODO: Maybe share build steps between `publish-npm` and `publish-docker`
                    'publish-docker': {
                        name: 'Publish Docker image to DockerHub',
                        needs: 'publish-npm',
                        'runs-on': 'ubuntu-latest',
                        'timeout-minutes': 30,
                        steps: [
                            {
                                name: '🔽 Checkout',
                                uses: 'actions/checkout@v4',
                            },
                            {
                                name: '🔑 Login to DockerHub',
                                uses: 'docker/login-action@v2',
                                with: {
                                    username: '${{ secrets.DOCKERHUB_USER }}',
                                    password: '${{ secrets.DOCKERHUB_TOKEN }}',
                                },
                            },
                            {
                                name: '🔽 Setup Node.js',
                                uses: 'actions/setup-node@v4',
                                with: {
                                    'node-version': 22,
                                    'registry-url': 'https://registry.npmjs.org/',
                                },
                            },
                            {
                                name: '🔽 Clone book submodule',
                                run: 'git submodule update --init --recursive',
                            },
                            {
                                name: '🆚 Load current version into the environment',
                                run: 'echo "VERSION=$(node -p \'require(`./package.json`).version\')" >> $GITHUB_ENV',
                            },
                            {
                                name: '👁‍🗨 Log version from previous step',
                                run: 'echo $VERSION',
                            },
                            {
                                name: '👁‍🗨 Log contents of the Dockerfile',
                                run: 'cat Dockerfile',
                            },
                            {
                                name: '🏭🔼 Build and Push Docker Image',
                                uses: 'docker/build-push-action@v2',
                                with: {
                                    context: '.',
                                    push: true,
                                    tags: 'hejny/promptbook:${{ env.VERSION }}',
                                },
                            },
                            {
                                name: '📝 Publish DockerHub description',
                                uses: 'peter-evans/dockerhub-description@v5',
                                with: {
                                    username: '${{ secrets.DOCKERHUB_USER }}',
                                    password: '${{ secrets.DOCKERHUB_TOKEN }}',
                                    repository: 'hejny/promptbook',
                                    'short-description': 'Promptbook Agents Server Docker image',
                                    'readme-filepath': './README.Docker.md',
                                },
                            },
                        ],
                    },
                },
            },
            { indent: 4 },
        )
    );
}

/**
 * Creates the shared publish-workflow test steps.
 *
 * @returns Workflow step definitions
 *
 * @private internal utility of package generation
 */
function createPublishWorkflowTestSteps(): Array<Record<string, unknown>> {
    /**
     * Here are spreaded all the commands from `npm run test-without-package-generation-and-unit`
     *
     * TODO: [⛎] Automatically sync with `test-without-package-generation-and-unit`
     */
    return [
        {
            name: '🧪 Test | Name discrepancies',
            run: `npm run test-name-discrepancies`,
        },
        {
            name: '🧪 Test | Spellcheck',
            run: `npm run test-spellcheck`,
        },
        {
            name: '🧪 Test | Lint',
            run: `npm run test-lint`,
        },
        {
            name: '🧪 Test | Types',
            run: `npm run test-types`,
        },
        {
            name: '🧪 Test | Books',
            run: `npm run test-books`,
            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
    ];
}

/**
 * Creates the shared publish-workflow `make` steps.
 *
 * @returns Workflow step definitions
 *
 * @private internal utility of package generation
 */
function createPublishWorkflowMakeSteps(): Array<Record<string, unknown>> {
    /**
     * Here are spreaded all the commands from `npm run make`
     *
     * TODO: [⛎] Automatically sync with `make`
     */
    return [
        {
            name: '🏭 Make | Promptbook Collection',
            run: `npm run make-promptbook-collection`,
            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
        {
            name: '🏭 Make | 🆚 Update Version in Config',
            run: `npm run update-version-in-config`,
        },
        {
            name: '🏭 Make | Generate Packages',
            run: `npm run generate-packages`,
        },
        {
            name: '🏭 Make | Generate .bookc from Examples',
            run: `npm run generate-examples-bookc`,
            env: {
                OPENAI_API_KEY: '${{secrets.OPENAI_API_KEY}}',
                // <- TODO: Add all api keys
            },
        },
        {
            name: '🏭 Make | Generate Documentation',
            run: `npm run generate-documentation`,
            env: {
                GITHUB_TOKEN: '${{secrets.GITHUB_TOKEN}}',
            },
        },
        {
            name: '🏭 Make | Import Markdowns',
            run: `npm run import-markdowns`,
        },
        {
            name: '🏭 Make | Generate OpenAPI Types',
            run: `npm run generate-openapi-types`,
        },
    ];
}

/**
 * Commits generated files when `--commit` is enabled.
 *
 * @param isCommitted - Whether package generation should auto-commit the result
 * @param mainPackageVersion - Shared Promptbook version
 *
 * @private internal utility of package generation
 */
async function maybeCommitGeneratedPackages(isCommitted: boolean, mainPackageVersion: string): Promise<void> {
    if (!isCommitted) {
        return;
    }

    await commit(['src/_packages', 'packages', '.github'], `📦 Generating packages \`${mainPackageVersion}\``);
}

/**
 * Logs one numbered package-generation phase header in a consistent style.
 *
 * @param stepLabel - Step label shown in the console
 *
 * @private internal utility of package generation
 */
function logPackageGenerationStep(stepLabel: string): void {
    console.info(colors.cyan(stepLabel));
}

// Note: [⚫] Code for repository script [generate-packages](scripts/generate-packages/generate-packages.ts) should never be published in any package
// TODO: [👵] test before publish
// TODO: Add warning to the copy/generated files
// TODO: Use prettier to format the generated files
// TODO: Normalize order of keys in package.json
