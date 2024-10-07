import { spawn } from 'child_process';
import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { forTime } from 'waitasecond';
import type { IExecCommandOptions } from './IExecCommandOptions';
import { execCommandNormalizeOptions } from './execCommandNormalizeOptions';

/**
 * Run one command in a shell
 *
 * Note: There are 2 similar functions in the codebase:
 * - `execCommand` which runs a single command
 * - `execCommands` which runs multiple commands
 *
 * @public exported from `@promptbook/node`
 */
export function execCommand(options: IExecCommandOptions): Promise<string> {
    // TODO: !!!!!! Check the environment and throw an error if it is not Node.js

    return new Promise(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        (resolve, reject) => {
            // eslint-disable-next-line prefer-const
            let { command, humanReadableCommand, args, cwd, crashOnError, timeout } =
                execCommandNormalizeOptions(options);

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

            if (/^win/.test(process.platform) && ['npm', 'npx'].includes(command)) {
                command = `${command}.cmd`;
            }

            // !!!!!! Verbose mode - to all consoles
            console.info(colors.yellow(cwd) + ' ' + colors.green(command) + ' ' + colors.blue(args.join(' ')));

            try {
                const commandProcess = spawn(command, args, { cwd, shell: true });

                commandProcess.on('message', (message) => {
                    console.info({ message });
                });

                const output: string[] = [];

                commandProcess.stdout.on('data', (stdout) => {
                    output.push(stdout.toString());
                    console.info(stdout.toString());
                });

                commandProcess.stderr.on('data', (stderr) => {
                    output.push(stderr.toString());
                    if (stderr.toString().trim()) {
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
                            console.warn(`Command "${humanReadableCommand}" exited with code ${code}`);
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
                        console.warn(error);
                        resolve(spaceTrim(output.join('\n')));
                    }
                });
            } catch (error) {
                // Note: Unexpected error in sync code should always result in rejection
                reject(error);
            }
        },
    );
}

/**
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 */
