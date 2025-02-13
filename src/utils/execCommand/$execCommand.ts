import { spawn } from 'child_process';
import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import { DEFAULT_IS_VERBOSE } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../environment/$isRunningInNode';
import { $execCommandNormalizeOptions } from './$execCommandNormalizeOptions';
import type { ExecCommandOptions } from './ExecCommandOptions';

/**
 * Run one command in a shell
 *
 *
 * Note: There are 2 similar functions in the codebase:
 * - `$execCommand` which runs a single command
 * - `$execCommands` which runs multiple commands
 * Note: `$` is used to indicate that this function is not a pure function - it runs a command in a shell
 *
 * @public exported from `@promptbook/node`
 */
export function $execCommand(options: ExecCommandOptions): Promise<string> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$execCommand` can run only in Node environment.js');
    }

    return new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        const {
            command,
            humanReadableCommand,
            args,
            cwd,
            crashOnError,
            timeout,
            isVerbose = DEFAULT_IS_VERBOSE,
        } = $execCommandNormalizeOptions(options);

        if (timeout !== Infinity) {
            // TODO: In waitasecond forTime(Infinity) should be equivalent to forEver()
            forTime(timeout).then(() => {
                if (crashOnError) {
                    reject(new Error(`Command "${humanReadableCommand}" exceeded time limit of ${timeout}ms`));
                } else {
                    console.warn(
                        `Command "${humanReadableCommand}" exceeded time limit of ${timeout}ms but continues running`,
                    );
                    resolve('Command exceeded time limit');
                }
            });
        }

        if (isVerbose) {
            console.info(colors.yellow(cwd) + ' ' + colors.green(command) + ' ' + colors.blue(args.join(' ')));
        }

        try {
            const commandProcess = spawn(command, args, { cwd, shell: true });

            if (isVerbose) {
                commandProcess.on('message', (message) => {
                    console.info({ message });
                });
            }

            const output: string[] = [];

            commandProcess.stdout.on('data', (stdout) => {
                output.push(stdout.toString());
                if (isVerbose) {
                    console.info(stdout.toString());
                }
            });

            commandProcess.stderr.on('data', (stderr) => {
                output.push(stderr.toString());
                if (isVerbose && stderr.toString().trim()) {
                    console.warn(stderr.toString());
                }
            });

            const finishWithCode = (code: number) => {
                if (code !== 0) {
                    if (crashOnError) {
                        reject(
                            new Error(
                                output.join('\n').trim() ||
                                    `Command "${humanReadableCommand}" exited with code ${code}`,
                            ),
                        );
                    } else {
                        if (isVerbose) {
                            console.warn(`Command "${humanReadableCommand}" exited with code ${code}`);
                        }
                        resolve(spaceTrim(output.join('\n')));
                    }
                } else {
                    resolve(spaceTrim(output.join('\n')));
                }
            };

            commandProcess.on('close', finishWithCode);
            commandProcess.on('exit', finishWithCode);
            commandProcess.on('disconnect', () => {
                // Note: Unexpected disconnection should always result in rejection
                reject(new Error(`Command "${humanReadableCommand}" disconnected`));
            });
            commandProcess.on('error', (error) => {
                if (crashOnError) {
                    reject(new Error(`Command "${humanReadableCommand}" failed: \n${error.message}`));
                } else {
                    if (isVerbose) {
                        console.warn(error);
                    }
                    resolve(spaceTrim(output.join('\n')));
                }
            });
        } catch (error) {
            // Note: Unexpected error in sync code should always result in rejection
            reject(error);
        }
    });
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
