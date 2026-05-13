import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { string_script } from '../../types/string_markdown';
import { OpenAiSdkTranspiler } from '../openai-sdk/OpenAiSdkTranspiler';
import type { BookTranspilerOptions } from '../_common/BookTranspilerOptions';

/**
 * Transpiler to a JavaScript launcher that runs the exported agent inside an E2B sandbox.
 *
 * @public exported from `@promptbook/core`
 */
export const E2BTranspiler = {
    name: 'e2b',
    title: 'E2B',
    packageName: '@promptbook/core',
    className: 'E2BTranspiler',
    async transpileBook(
        book: string_book,
        tools: ExecutionTools,
        options?: BookTranspilerOptions,
    ): Promise<string_script> {
        const openAiSdkHarnessSource = await OpenAiSdkTranspiler.transpileBook(book, tools, options);
        const sandboxEnvironmentVariableNames = extractEnvironmentVariablesFromSource(openAiSdkHarnessSource);

        return spaceTrim(
            (block) => `#!/usr/bin/env node

                import * as dotenv from 'dotenv';
                import { readFile } from 'node:fs/promises';
                import { Sandbox } from 'e2b';

                dotenv.config({ path: '.env' });

                const E2B_API_KEY = process.env.E2B_API_KEY;

                if (!E2B_API_KEY) {
                    throw new Error('Missing required environment variable E2B_API_KEY.');
                }

                const AGENT_HARNESS_SOURCE = ${block(JSON.stringify(openAiSdkHarnessSource))};
                const SANDBOX_ENVIRONMENT_VARIABLES = ${block(
                    createSandboxEnvironmentVariablesObjectLiteralSource(sandboxEnvironmentVariableNames),
                )};
                const SANDBOX_WORKING_DIRECTORY = '/home/user/promptbook-agent';
                const SANDBOX_PACKAGE_JSON_PATH = ${block(JSON.stringify('/home/user/promptbook-agent/package.json'))};
                const SANDBOX_AGENT_HARNESS_PATH = ${block(
                    JSON.stringify('/home/user/promptbook-agent/agent-harness.mjs'),
                )};
                let activeSandbox = null;
                let activeCommand = null;
                let isShuttingDown = false;

                process.once('SIGINT', () => {
                    void shutdown(130);
                });

                /**
                 * Starts the E2B-backed launcher and streams the inner agent harness through the sandbox.
                 */
                async function main() {
                    const sandbox = await Sandbox.create({
                        envs: SANDBOX_ENVIRONMENT_VARIABLES,
                        timeoutMs: 60 * 60 * 1000,
                        lifecycle: {
                            onTimeout: 'pause',
                            autoResume: true,
                        },
                    });
                    activeSandbox = sandbox;

                    const packageJson = await readFile(new URL('./package.json', import.meta.url), 'utf8');

                    await sandbox.files.write(SANDBOX_PACKAGE_JSON_PATH, packageJson);
                    await sandbox.files.write(SANDBOX_AGENT_HARNESS_PATH, AGENT_HARNESS_SOURCE);

                    console.log('🧱 E2B sandbox is ready. Installing dependencies...');

                    await sandbox.commands.run('npm install', {
                        cwd: SANDBOX_WORKING_DIRECTORY,
                        timeoutMs: 60 * 60 * 1000,
                        onStdout: (data) => process.stdout.write(data),
                        onStderr: (data) => process.stderr.write(data),
                    });

                    console.log('🤖 Launching the agent inside the E2B sandbox...');

                    const command = await sandbox.commands.run('node ./agent-harness.mjs', {
                        cwd: SANDBOX_WORKING_DIRECTORY,
                        background: true,
                        stdin: true,
                        timeoutMs: 60 * 60 * 1000,
                        onStdout: (data) => process.stdout.write(data),
                        onStderr: (data) => process.stderr.write(data),
                    });
                    activeCommand = command;

                    process.stdin.setEncoding('utf8');
                    process.stdin.resume();
                    process.stdin.on('data', (chunk) => {
                        void command.sendStdin(chunk).catch(() => {
                            // Ignore input forwarding errors after the sandbox process has already exited.
                        });
                    });

                    process.stdin.on('end', () => {
                        void shutdown(0);
                    });

                    const result = await command.wait();
                    await shutdown(result.exitCode ?? 0);
                }

                main().catch((error) => {
                    console.error(error);
                    process.exit(1);
                });

                /**
                 * Cleans up the inner sandbox and exits the launcher.
                 *
                 * @param exitCode - Process exit code used after cleanup completes.
                 */
                async function shutdown(exitCode) {
                    if (isShuttingDown) {
                        return;
                    }

                    isShuttingDown = true;

                    if (activeCommand) {
                        try {
                            await activeCommand.kill();
                        } catch {
                            // Ignore cleanup errors when the command is already gone.
                        }
                    }

                    if (activeSandbox) {
                        try {
                            await activeSandbox.kill();
                        } catch {
                            // Ignore cleanup errors when the sandbox is already gone.
                        }
                    }

                    process.exit(exitCode);
                }
            `,
        );
    },
} as const satisfies BookTranspiler;

/**
 * Extracts `process.env` variables referenced in the generated harness source.
 *
 * @param source - Generated harness source.
 * @returns Sorted unique environment variable names used by the harness.
 *
 * @private helper of `E2BTranspiler`
 */
function extractEnvironmentVariablesFromSource(source: string): Array<string> {
    const environmentVariables = new Set<string>();

    for (const match of source.matchAll(PROCESS_ENV_DOT_NOTATION_PATTERN)) {
        environmentVariables.add(match[1]!);
    }

    for (const match of source.matchAll(PROCESS_ENV_BRACKET_NOTATION_PATTERN)) {
        environmentVariables.add(match[1]!);
    }

    return [...environmentVariables].sort((leftEnvironmentVariable, rightEnvironmentVariable) =>
        leftEnvironmentVariable.localeCompare(rightEnvironmentVariable),
    );
}

/**
 * Creates the sandbox environment object literal used by the launcher.
 *
 * @param environmentVariableNames - Environment variables referenced by the inner harness.
 * @returns JavaScript object literal source for `Sandbox.create({ envs })`.
 *
 * @private helper of `E2BTranspiler`
 */
function createSandboxEnvironmentVariablesObjectLiteralSource(environmentVariableNames: ReadonlyArray<string>): string {
    if (environmentVariableNames.length === 0) {
        return '{}';
    }

    return spaceTrim(
        (block) => `{
            ${block(
                environmentVariableNames
                    .map(
                        (environmentVariableName) =>
                            `...(process.env.${environmentVariableName} ? { ${environmentVariableName}: process.env.${environmentVariableName} } : {}),`,
                    )
                    .join('\n'),
            )}
        }`,
    );
}

/**
 * Matches dot-notation `process.env` references.
 *
 * @private internal constant of `E2BTranspiler`
 */
const PROCESS_ENV_DOT_NOTATION_PATTERN = /process\.env\.([A-Z][A-Z0-9_]*)/g;

/**
 * Matches bracket-notation `process.env` references.
 *
 * @private internal constant of `E2BTranspiler`
 */
const PROCESS_ENV_BRACKET_NOTATION_PATTERN = /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g;
