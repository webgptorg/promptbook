import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import prompts from 'prompts';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { isValidEmail } from '../../utils/validators/email/isValidEmail';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `login` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeLoginCommand(program: Program) {
    const loginCommand = program.command('login');
    loginCommand.description(
        spaceTrim(`
            Login to the remote Promptbook server
        `),
    );

    loginCommand.action(
        handleActionErrors(async () => {
            // @@@

            console.error(
                colors.green(
                    spaceTrim(`
                        You will be logged in to https://promptbook.studio server.
                        If you don't have an account, it will be created automatically.
                    `),
                ),
            );

            // !!!!!!!!! Remove from here and use $provideLlmToolsForCli
            const { email, password } = await prompts([
                {
                    type: 'text',
                    name: 'email',
                    message: 'Enter your email:', // <- TODO: [🧠] What is the message here
                    validate: (value) => (isValidEmail(value) ? true : 'Valid email is required'),
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Enter your password:', // <- TODO: [🧠] What is the message here
                    validate: (value) =>
                        value.length /* <- TODO: [🧠] Better password validation */ > 0 ? true : 'Password is required',
                },
            ]);

            TODO_USE(email, password);
            await forTime(1000);

            console.error(
                colors.green(
                    spaceTrim(`
                        Your account ${email} was successfully created.

                        Please verify your email:
                        https://brj.app/api/v1/customer/register-account?apiKey=PRODdh003eNKaec7PoO1AzU244tsL4WO

                        After verification, you will receive 500 000 credits for free 🎉
                    `), // <- 500 000 Should be defined as a constant
                ),
            );

            return process.exit(0);
        }),
    );
}

/**
 * TODO: Pass remote server URL (and path)
 * TODO: Implement non-interactive login
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
