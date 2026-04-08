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
import { TODO_any } from '../../src/utils/organization/TODO_any';
import { commit } from '../utils/autocommit/commit';
import { isWorkingTreeClean } from '../utils/autocommit/isWorkingTreeClean';
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
const { commit: isCommited, skipBundler: isBundlerSkipped } = program.opts();

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

generatePackages({ isCommited, isBundlerSkipped })
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
async function generatePackages({ isCommited, isBundlerSkipped }: { isCommited: boolean; isBundlerSkipped: boolean }) {
    console.info(`📦  Generating packages`);

    if (isCommited && !(await isWorkingTreeClean(process.cwd()))) {
        throw new Error(`Working tree is not clean`);
    }

    // ==============================
    console.info(colors.cyan(`0️⃣  Prepare the needed information about the packages`));
    const mainPackageJson = JSON.parse(await readFile('./package.json', 'utf-8')) as PackageJson;

    console.info(`Promptbook version ${mainPackageJson.version}`);

    if (!mainPackageJson.version) {
        throw new Error(`Version is not defined in the package.json`);
    }

    const allDependencies = {
        ...mainPackageJson.dependencies,
        // <- TODO: Maybe add `devDependencies` and check collisions between `dependencies` and `devDependencies`
    };

    const packagesMetadata = await getPackagesMetadata();

    // ==============================
    console.info(colors.cyan(`1️⃣  Generate entry file for each package`));

    for (const packageMetadata of packagesMetadata) {
        const { entryIndexFilePath, entities, packageFullname } = packageMetadata;

        if (entryIndexFilePath === null) {
            continue;
        }

        if (entities === undefined) {
            throw new Error(`Entities are not defined for ${packageMetadata.packageFullname}`);
        }

        const entryIndexFilePathContentImports: Array<string> = [];
        const entryIndexFilePathContentExports: Array<string> = [];

        for (const entity of entities) {
            const { filename, name } = entity;
            let { isType } = entity;

            if (packageFullname === '@promptbook/types') {
                // Note: Everything in `@promptbook/types` is exported JUST as type
                isType = true;
            }

            let importPath = `${relative(dirname(entryIndexFilePath), filename).split('\\').join('/')}`;
            if (!importPath.startsWith('.')) {
                importPath = './' + importPath;
            }
            if (importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
                importPath = importPath.replace(/\.(ts|tsx)$/, '');
            }
            const typePrefix = !isType ? '' : ' type';

            entryIndexFilePathContentImports.push(`import${typePrefix} { ${name} } from '${importPath}';`);
            entryIndexFilePathContentExports.push(`export${typePrefix} { ${name} };`);
        }

        let entryIndexFilePathContent: string;

        if (packageFullname !== '@promptbook/types') {
            // TODO: DRY [1]
            const useClientDirective = packageFullname === '@promptbook/components' ? "'use client';" : '';
            entryIndexFilePathContent = spaceTrim(
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
        } else {
            // TODO: DRY [1]
            entryIndexFilePathContent = spaceTrim(
                (block) => `
                    // ${block(GENERATOR_WARNING)}
                    // \`${packageFullname}\`

                    ${block(entryIndexFilePathContentImports.join('\n'))}

                    // Note: Entities of the \`${packageFullname}\`
                    ${block(entryIndexFilePathContentExports.join('\n'))}

                `,
            );
        }

        entryIndexFilePathContent += '\n';

        // TODO: `entryIndexFilePathContent = await prettifyTypeScript(entryIndexFilePathContent)`

        await writeFile(entryIndexFilePath, entryIndexFilePathContent, 'utf-8');
        console.info(colors.green('Generated index file ' + entryIndexFilePath.split('\\').join('/')));
    }

    // ==============================
    console.info(colors.cyan(`2️⃣  Generate package.json, README and other crucial files for each package`));

    const mainReadme = await readFile('./README.md', 'utf-8');
    for (const { isBuilded, readmeFilePath, packageFullname, packageBasename } of packagesMetadata) {
        let packageReadme = mainReadme;
        const packageReadmeExtra = await readFile(readmeFilePath, 'utf-8');

        let installCommand = spaceTrim(`

            # Install just this package to save space
            npm install ${packageFullname}

        `);

        if (packageFullname === '@promptbook/cli') {
            installCommand = spaceTrim(`

                # Install as dev dependency
                npm install --save-dev ${packageFullname}

                # Or install globally
                npm install --global ${packageFullname}

            `);
        } else if (packageFullname === '@promptbook/types') {
            installCommand = `npm i -D ${packageFullname}`;
        }

        let prereleaseWarning = '';

        if (mainPackageJson.version.includes('-')) {
            // TODO: Link latest stable release automatically
            prereleaseWarning = spaceTrim(`
                <blockquote style="color: #ff8811">
                    <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
                </blockquote>
            `);
        }

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

        /*
        TODO: Fix or remove Socket badge

        const badge = `[![Socket Badge](https://socket.dev/api/badge/npm/package/${packageFullname})](https://socket.dev/npm/package/${packageFullname})`;

        packageReadme = packageReadme.split(`\n<!--/Badges-->`).join(badge + '\n\n<!--/Badges-->');
        */

        // TODO: [🍓] Convert mermaid diagrams to images or remove them from the markdown published to NPM

        packageReadme = removeMarkdownComments(packageReadme);

        packageReadme = spaceTrim(
            (block) => `
                <!-- ${block(GENERATOR_WARNING)} -->

                ${block(packageReadme)}
            `,
        );
        prettifyMarkdown(packageReadme);

        await mkdir(`./packages/${packageBasename}`, { recursive: true });
        await writeFile(
            `./packages/${packageBasename}/README.md`,
            packageReadme,
            /*
            spaceTrim(`

                # ![Promptbook logo](./design/logo-h1.png) Promptbook

                Supercharge your use of large language models

                [Read the manual](https://github.com/webgptorg/promptbook)

            `),
            */
        );

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

        if (packageFullname === '@promptbook/utils' || packageFullname === '@promptbook/markdown-utils') {
            packageJson.license = 'CC-BY-4.0';
        } else {
            packageJson.license = 'BUSL-1.1';
        }

        packageJson.name = packageFullname;

        // Note: [❇️] Joining dynamic and general keywords
        const generalKeywords = [
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
        ];

        // Dynamic keywords based on package functionality
        const dynamicKeywords: string[] = [];

        // Add LLM provider specific keywords
        if (packageFullname.includes('openai')) {
            dynamicKeywords.push(
                'openai',
                'gpt-3',
                'gpt-4',
                'gpt-4o',
                'gpt-4o-mini',
                'o1',
                'o1-mini',
                'o1-preview',
                'o3',
                'o3-mini',
                'chatgpt',
            );
        }
        if (packageFullname.includes('anthropic')) {
            dynamicKeywords.push(
                'anthropic',
                'claude',
                'claude-3',
                'claude-3-opus',
                'claude-3-sonnet',
                'claude-3-haiku',
            );
        }
        if (packageFullname.includes('google')) {
            dynamicKeywords.push('google', 'gemini', 'gemini-pro', 'gemini-flash');
        }
        if (packageFullname.includes('deepseek')) {
            dynamicKeywords.push('deepseek');
        }
        if (packageFullname.includes('ollama')) {
            dynamicKeywords.push('ollama', 'local-llm', 'self-hosted');
        }
        if (packageFullname.includes('azure')) {
            dynamicKeywords.push('azure', 'azure-openai', 'microsoft');
        }
        if (packageFullname.includes('vercel')) {
            dynamicKeywords.push('vercel', 'vercel-ai', 'edge-functions');
        }

        // Add functionality specific keywords
        if (packageFullname.includes('cli')) {
            dynamicKeywords.push('cli', 'cli-tool', 'command-line', 'terminal', 'automation');
        }
        if (packageFullname.includes('browser')) {
            dynamicKeywords.push('browser', 'web', 'client-side', 'frontend');
        }
        if (packageFullname.includes('node')) {
            dynamicKeywords.push('nodejs', 'server-side', 'backend');
        }
        if (packageFullname.includes('remote')) {
            dynamicKeywords.push('remote-execution', 'distributed', 'cloud', 'server');
        }
        if (packageFullname.includes('types')) {
            dynamicKeywords.push('typescript', 'types', 'type-definitions', 'intellisense');
        }
        if (packageFullname.includes('utils')) {
            dynamicKeywords.push('utilities', 'helpers', 'tools', 'preprocessing', 'postprocessing');
        }
        if (packageFullname.includes('markdown')) {
            dynamicKeywords.push('markdown', 'markdown-processing', 'text-processing');
        }
        if (packageFullname.includes('pdf')) {
            dynamicKeywords.push('pdf', 'pdf-processing', 'document-processing');
        }
        if (packageFullname.includes('documents')) {
            dynamicKeywords.push('document-processing', 'docx', 'odt', 'office-documents');
        }
        if (packageFullname.includes('website-crawler')) {
            dynamicKeywords.push('web-scraping', 'website-crawler', 'scraping', 'crawling');
        }
        if (packageFullname.includes('fake-llm')) {
            dynamicKeywords.push('testing', 'mocking', 'fake', 'mock-llm', 'development');
        }
        if (packageFullname.includes('wizard')) {
            dynamicKeywords.push('wizard', 'setup', 'configuration', 'getting-started');
        }
        if (packageFullname.includes('javascript')) {
            dynamicKeywords.push('javascript', 'js', 'scripting', 'execution');
        }
        if (packageFullname.includes('editable')) {
            dynamicKeywords.push('editable', 'dynamic', 'runtime', 'imperative');
        }
        if (packageFullname.includes('templates')) {
            dynamicKeywords.push('templates', 'examples', 'boilerplate', 'starter');
        }

        // Combine and deduplicate keywords
        const combinedKeywords = [...new Set([...generalKeywords, ...dynamicKeywords])].sort();
        packageJson.keywords = combinedKeywords;

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded) {
            await writeFile(`./packages/${packageBasename}/.gitignore`, ['esm', 'umd', 'apps'].join('\n'));
            await writeFile(
                `./packages/${packageBasename}/.npmignore`,
                spaceTrim(`
                    # ${GENERATOR_WARNING}

                    stats.html
                `),
            );
        }
    }

    // ==============================
    console.info(colors.cyan(`3️⃣  Cleanup build directories for each package`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the cleanup for bundler`));
    } else {
        for (const packageMetadata of packagesMetadata) {
            const { isBuilded, packageBasename } = packageMetadata;

            if (!isBuilded) {
                continue;
            }
            await $execCommand(`rm -rf ./packages/${packageBasename}/umd`);
            await $execCommand(`rm -rf ./packages/${packageBasename}/esm`);
        }
    }

    // ==============================
    console.info(colors.cyan(`4️⃣  Generate bundle for each package`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler`));
    } else {
        await forTime(1000 * 60 * 60 * 0);

        // Note: Every minute report time + resources (GitHub Actions friendly)
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
                console.error(
                    `🔇 Time since last Rollup output: ${formatDurationForLog(now - activeRollupBuild.lastOutputAt)}`,
                );
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

        try {
            // Note: Build each package separately to avoid memory issues and improve build reliability
            const buildablePackages = packagesMetadata.filter(({ isBuilded }) => isBuilded);

            for (let i = 0; i < buildablePackages.length; i++) {
                const { packageBasename, packageFullname } = buildablePackages[i];

                console.info(`--- ${packageFullname} ---`);
                console.info(
                    colors.blue(`📦 Building package ${i + 1}/${buildablePackages.length}: ${packageFullname}`),
                );

                await buildPackageBundle(packageBasename, packageFullname);

                console.info(colors.green(`✅ Package ${packageFullname} built successfully`));
            }

            console.info(colors.green('✅✅ All packages built successfully'));
        } finally {
            clearInterval(timeReportingInterval);
        }
    }

    // ==============================
    console.info(colors.cyan(`5️⃣  Postprocess the generated bundle`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping postprocessing`));
    } else {
        // Note: Keep `typings` only from `esm` (and remove `umd`)
        for (const packageMetadata of packagesMetadata) {
            const { packageBasename } = packageMetadata;
            await $execCommand(`rm -rf ./packages/${packageBasename}/umd/typings`);
        }
    }

    // TODO: Add GENERATOR_WARNING to each generated file

    /**
     * Finds the first occurrence of a marker in file content and returns formatted line information
     *
     * @param fileContent - The content of the file to search
     * @param marker - The marker to search for (e.g., '[🟢]', '[⚪]')
     * @param fileName - The file name for display purposes
     * @returns Formatted string with line number and content, or empty string if marker not found
     */
    function findMarkerLine(fileContent: string, marker: string, fileName: string): string {
        const lines = fileContent.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(marker)) {
                const lineNumber = i + 1;
                const lineContent = lines[i].trim();
                return spaceTrim(`

                    In line ${lineNumber}:
                    ${lineContent}
                `);
            }
        }
        return '';
    }

    // ==============================
    console.info(colors.cyan(`6️⃣  Test that nothing what should not be published is published`));

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler, skipping the tests for bundle content`));
    } else {
        for (const packageMetadata of packagesMetadata) {
            const { packageBasename, packageFullname } = packageMetadata;
            const bundleFileNames = await glob(`./packages/${packageBasename}/**/*`, { nodir: true });

            for (const bundleFileName of bundleFileNames) {
                if (
                    bundleFileName.includes('/typings/') ||
                    bundleFileName.endsWith('.d.ts') /* <- TODO: !!!!!!!!! Is this working */
                ) {
                    // <- TODO: Maybe exclude "typings" directly in glob
                    continue;
                }

                const bundleFileContent = await readFile(bundleFileName, 'utf-8');

                if (bundleFileContent.includes('[⚫]')) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                                Things marked with [⚫] should never be never released in the bundle

                                ${bundleFileName}
                                ${block(findMarkerLine(bundleFileContent, '[⚫]', bundleFileName))}
                            `,
                        ),
                    );
                }

                if (bundleFileContent.includes('[⚪]')) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                                Things marked with [⚪] should never be in a released package.

                                ${bundleFileName}
                                ${block(findMarkerLine(bundleFileContent, '[⚪]', bundleFileName))}
                            `,
                        ),
                    );
                }

                if (packageFullname !== '@promptbook/cli' && bundleFileContent.includes('[🟡]')) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                                Things marked with [🟡] should never be never released out of @promptbook/cli

                                ${bundleFileName}
                                ${block(findMarkerLine(bundleFileContent, '[🟡]', bundleFileName))}
                            `,
                        ),
                    );
                }

                if (
                    // Note: Packages for Node.js only:
                    packageFullname !== '@promptbook/node' &&
                    packageFullname !== '@promptbook/cli' &&
                    packageFullname !== '@promptbook/wizard' &&
                    packageFullname !== '@promptbook/remote-server' &&
                    packageFullname !== '@promptbook/documents' &&
                    packageFullname !== '@promptbook/legacy-documents' &&
                    packageFullname !== '@promptbook/website-crawler' &&
                    packageFullname !== '@promptbook/markitdown' &&
                    packageFullname !== '@promptbook/pdf' &&
                    // <- Note: [➕] When making new package, list it here when this package is for node environment
                    bundleFileContent.includes('[🟢]')
                ) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                                Things marked with [🟢] should never be never released in packages that could be imported into browser environment

                                But found in package \`${packageFullname}\`

                                Analyze the issue in the bundle file:
                                ${block(bundleFileName)}
                                <- Search for [🟢] marker
                                ${block(findMarkerLine(bundleFileContent, '[🟢]', bundleFileName))}
                            `,
                        ),
                    );
                }

                if (
                    packageFullname !== '@promptbook/browser' &&
                    packageFullname !== '@promptbook/components' &&
                    // <- Note: [➕] When making new package, list it here when this package is for browser environment
                    bundleFileContent.includes('[🔵]')
                ) {
                    throw new Error(
                        spaceTrim(
                            (block) => `
                                Things marked with [🔵] should never be never released out of @promptbook/browser

                                ${bundleFileName}
                                ${block(findMarkerLine(bundleFileContent, '[🔵]', bundleFileName))}
                            `,
                        ),
                    );
                }

                // console.info(colors.green(`Checked file ${bundleFileName}`));
            }
        }
    }

    // TODO: Check that `@promptbook/types` does not contain any runtime code and if not, delete the empty `esm` and `umd` directories and keep only typings

    // ==============================
    console.info(colors.cyan(`7️⃣  Add dependencies for each package`));

    for (const { isBuilded, packageFullname, packageBasename, additionalDependencies } of packagesMetadata) {
        const packageJson = JSON.parse(
            await readFile(`./packages/${packageBasename}/package.json`, 'utf-8'),
        ) as PackageJson;
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?

        if (isBuilded && packageFullname !== '@promptbook/cli') {
            if (packageFullname !== '@promptbook/types') {
                packageJson.main = `./umd/index.umd.js`;
                packageJson.module = `./esm/index.es.js`;
            }
            packageJson.typings = `./esm/typings/src/_packages/${packageBasename}.index.d.ts`;
        }

        if (packageFullname === '@promptbook/components') {
            // React component library should rely on host app React versions
            packageJson.peerDependencies = {
                react: '>=17.0.0',
                'react-dom': '>=17.0.0',
            };
            // Ensure no hard dependency on React to avoid duplicate installs/bundles
            delete (packageJson as TODO_any).dependencies;
        } else if (
            !['@promptbook/core', '@promptbook/utils', '@promptbook/cli', '@promptbook/markdown-utils'].includes(
                packageFullname,
            )
        ) {
            packageJson.peerDependencies = {
                '@promptbook/core': packageJson.version,
            };
        }

        if (isBuilded) {
            const bundleName = `./packages/${packageBasename}/esm/index.es.js`;

            let indexContent = '';
            if (await isFileExisting(bundleName, fs)) {
                indexContent = await readFile(bundleName, 'utf-8');
            } else {
                console.warn(colors.yellow(`Bundle file ${bundleName} does not exist`));
            }

            for (const dependencyName of Object.keys(allDependencies)) {
                if (
                    indexContent.includes(`from '${dependencyName}'`) ||
                    indexContent.includes(`require('${dependencyName}')`) ||
                    indexContent.includes(`require("${dependencyName}")`) ||
                    indexContent.includes(`import('${dependencyName}')`) ||
                    indexContent.includes(`import("${dependencyName}")`)
                ) {
                    packageJson.dependencies = packageJson.dependencies || {};

                    if (allDependencies[dependencyName] === undefined) {
                        throw new Error(`Can not find version for dependency "${dependencyName}"`);
                    }

                    packageJson.dependencies[dependencyName] = allDependencies[dependencyName];
                    // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
                }
            }
        }

        for (const dependencyName of additionalDependencies) {
            packageJson.dependencies = packageJson.dependencies || {};
            packageJson.dependencies[dependencyName] = packageJson.version;
            // <- Note: [🧃] Using only `dependencies` (not `devDependencies`)
        }

        if (packageFullname === '@promptbook/cli') {
            packageJson.bin = {
                promptbook: 'bin/promptbook-cli.js',
                ptbk: 'bin/promptbook-cli.js',
                book: 'bin/promptbook-cli.js',
                bk: 'bin/promptbook-cli.js',
                // <- TODO: [🧠] Pick one of and remove rest
            };
        } else if (packageFullname === 'ptbk') {
            packageJson.bin = {
                ptbk: 'bin/promptbook-cli-proxy.js',
            };
        }

        // Finalize dependencies for React component library: ensure React stays as peer only
        if (packageFullname === '@promptbook/components' && (packageJson as TODO_any).dependencies) {
            delete (packageJson as TODO_any).dependencies['react'];
            delete (packageJson as TODO_any).dependencies['react-dom'];
            if (Object.keys((packageJson as TODO_any).dependencies).length === 0) {
                delete (packageJson as TODO_any).dependencies;
            }
        }

        await writeFile(`./packages/${packageBasename}/package.json`, JSON.stringify(packageJson, null, 4) + '\n');
        //     <- TODO: Add GENERATOR_WARNING to package.json
        //     <- TODO: [0] package.json is is written twice, can it be done in one step?
    }

    // ==============================
    if (just(false /* <- Note: Temporarily disable the Copy agents-server app */)) {
        console.info(colors.cyan(`8️⃣  Copy agents-server app to CLI package`));

        // Note: Copy agents-server app files to the CLI package for distribution
        const agentsServerSourcePath = './apps/agents-server';
        const agentsServerDestPath = './packages/cli/apps/agents-server';

        console.info(`Copying ${agentsServerSourcePath} to ${agentsServerDestPath}`);

        // Remove existing destination directory if it exists
        await $execCommand(`rm -rf ${agentsServerDestPath}`);

        // Create destination directory
        await mkdir(agentsServerDestPath, { recursive: true });

        // Copy all files except .next folder
        // Using rsync or cp with exclusion pattern
        await $execCommand(`cp -r ${agentsServerSourcePath}/* ${agentsServerDestPath}/ || true`);

        // Remove .next folder if it was copied
        await $execCommand(`rm -rf ${agentsServerDestPath}/.next`);

        console.info(colors.green('Agents-server app copied successfully'));
    }

    // ==============================
    console.info(colors.cyan(`9️⃣  Make publishing instructions for Github Actions`));

    /**
     * Here are spreaded all the commands from `npm run test-without-package-generation-and-unit`
     *
     * TODO: [⛎] Automatically sync with `test-without-package-generation-and-unit`
     */
    const testSteps = [
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

    /**
     * Here are spreaded all the commands from `npm run make`
     *
     * TODO: [⛎] Automatically sync with `make`
     */
    const makeSteps = [
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

    await writeFile(
        `./.github/workflows/publish.yml`,
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
                                    name: '🔽 Install dependencies',
                                    run: 'npm ci',
                                },
                                {
                                    name: '🔽 Clone book submodule',
                                    run: 'git submodule update --init --recursive',
                                },
                                {
                                    name: '🆚 Update version in Dockerfile',
                                    run: 'npx ts-node ./scripts/update-version-in-config/update-version-in-config.ts',
                                    // <- Note: Update version in Dockerfile before building the image
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
                            ],
                        },
                    },
                },
                { indent: 4 },
            ),
    );
    // <- Note: All changes affects up to version folowing the next one, so it is safe to run "🏭📦 Generate packages" script to affect the next version

    // ==============================
    // 🔟 Commit the changes

    if (isCommited) {
        await commit(['src/_packages', 'packages', '.github'], `📦 Generating packages \`${mainPackageJson.version}\``);
    }
}

// Note: [⚫] Code for repository script [generate-packages](scripts/generate-packages/generate-packages.ts) should never be published in any package
// TODO: [👵] test before publish
// TODO: Add warning to the copy/generated files
// TODO: Use prettier to format the generated files
// TODO: Normalize order of keys in package.json
