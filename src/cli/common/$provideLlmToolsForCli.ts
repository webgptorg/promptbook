import colors from 'colors';
import prompts from 'prompts';
import spaceTrim from 'spacetrim';
import { LlmExecutionToolsWithTotalUsage } from '../../_packages/types.index';
import { CLI_APP_ID } from '../../config';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $provideLlmToolsForWizzardOrCli } from '../../llm-providers/_common/register/$provideLlmToolsForWizzardOrCli';
import type { CacheLlmToolsOptions } from '../../llm-providers/_common/utils/cache/CacheLlmToolsOptions';
import type { LoginResponse } from '../../remote-server/types/RemoteServerOptions';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import type { string_promptbook_server_url, string_url } from '../../types/typeAliases';
import type { really_unknown } from '../../utils/organization/really_unknown';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { isValidEmail } from '../../utils/validators/email/isValidEmail';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';

type ProvideLlmToolsForCliOptions = Pick<CacheLlmToolsOptions, 'isCacheReloaded'> & {
    /**
     * If true, user will be always prompted for login
     *
     * Note: This is used in `ptbk login` command
     */
    isLoginloaded?: true;

    /**
     * CLI options
     */
    cliOptions: {
        verbose: boolean;
        interactive: boolean;
        provider: 'BYOK' | 'BRING_YOUR_OWN_KEYS' | 'REMOTE_SERVER' | 'RS' | string;
        remoteServerUrl: string_promptbook_server_url;
    };
};

/**
 * @private utility of CLI
 */
export async function $provideLlmToolsForCli(options: ProvideLlmToolsForCliOptions): Promise<{
    strategy: 'BRING_YOUR_OWN_KEYS' | 'REMOTE_SERVER';
    llm: LlmExecutionToolsWithTotalUsage;

    // <- TODO: [🧠][🌞] Maybe provide other tools from here
}> {
    const {
        isLoginloaded,
        cliOptions: {
            /* TODO: Use verbose: isVerbose, */ interactive: isInteractive,
            provider,
            remoteServerUrl: remoteServerUrlRaw,
        },
    } = options;

    let strategy: 'BRING_YOUR_OWN_KEYS' | 'REMOTE_SERVER';

    if (/^b/i.test(provider)) {
        strategy = 'BRING_YOUR_OWN_KEYS';
    } else if (/^r/i.test(provider)) {
        strategy = 'REMOTE_SERVER';
    } else {
        console.log(colors.red(`Unknown provider: "${provider}", please use "BRING_YOUR_OWN_KEYS" or "REMOTE_SERVER"`));
        process.exit(1);
    }

    if (strategy === 'BRING_YOUR_OWN_KEYS') {
        if (isLoginloaded) {
            throw new UnexpectedError(
                `\`$provideLlmToolsForCli\` isLoginloaded is not supported for strategy "BRING_YOUR_OWN_KEYS"`,
            );
        }

        const llm = await $provideLlmToolsForWizzardOrCli({ strategy, ...options });
        return { strategy, llm };
    } else if (strategy === 'REMOTE_SERVER') {
        if (!isValidUrl(remoteServerUrlRaw)) {
            console.log(colors.red(`Invalid URL of remote server: "${remoteServerUrlRaw}"`));
            process.exit(1);
        }

        const remoteServerUrl = remoteServerUrlRaw.endsWith('/') ? remoteServerUrlRaw.slice(0, -1) : remoteServerUrlRaw;

        const llm = await $provideLlmToolsForWizzardOrCli({
            isLoginloaded,
            strategy,
            appId: CLI_APP_ID,
            remoteServerUrl,
            ...options,
            async loginPrompt() {
                if (!isInteractive) {
                    console.log(colors.red(`You can not login to remote server in non-interactive mode`));
                    process.exit(1);
                }

                console.info(
                    colors.cyan(
                        spaceTrim(`
                          You will be logged in to ${remoteServerUrl}
                          If you don't have an account, it will be created automatically.
                      `),
                    ),
                );

                const { username, password } = await prompts([
                    {
                        type: 'text',
                        name: 'username',
                        message: 'Enter your email:', // <- TODO: [🧠] What is the message here, asking for email but outputting username
                        validate: (value) => (isValidEmail(value) ? true : 'Valid email is required'),
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Enter your password:', // <- TODO: [🧠] What is the message here
                        validate: (value) =>
                            value.length /* <- TODO: [🧠] Better password validation */ > 0
                                ? true
                                : 'Password is required',
                    },
                ]);

                const loginUrl = `${remoteServerUrl}/login`;

                // TODO: [🧠] Should we use normal `fetch` or `scraperFetch`
                const response = await promptbookFetch(loginUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        appId: CLI_APP_ID,
                        username,
                        password,
                    }),
                });

                const { isSuccess, message, error, identification } =
                    (await response.json()) as LoginResponse<really_unknown>;

                TODO_USE(error);

                if (message) {
                    if (isSuccess) {
                        console.log(colors.green(message));
                    } else {
                        console.log(colors.red(message));
                    }
                }

                if (!isSuccess) {
                    // Note: Login failed
                    process.exit(1);
                }

                if (!identification) {
                    // Note: Do not get identification here, but server signalizes the success so exiting but with code 0
                    //       This can mean for example that user needs to verify email
                    process.exit(0);
                }

                return identification;
            },
        });

        return { strategy, llm };
    } else {
        throw new UnexpectedError(`\`$provideLlmToolsForCli\` wrong strategy "${strategy}"`);
    }
}
