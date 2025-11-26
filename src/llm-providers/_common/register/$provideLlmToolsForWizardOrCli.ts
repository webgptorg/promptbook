import { join } from 'path';
import { Promisable } from 'type-fest';
import { DEFAULT_EXECUTION_CACHE_DIRNAME, DEFAULT_REMOTE_SERVER_URL } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { Identification } from '../../../remote-server/socket-types/_subtypes/Identification';
import { identificationToPromptbookToken } from '../../../remote-server/socket-types/_subtypes/identificationToPromptbookToken';
import { promptbookTokenToIdentification } from '../../../remote-server/socket-types/_subtypes/promptbookTokenToIdentification';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { $EnvStorage } from '../../../storage/env-storage/$EnvStorage';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import type { string_app_id, string_promptbook_token, string_url } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import type { chococake } from '../../../utils/organization/really_any';
import { RemoteLlmExecutionTools } from '../../remote/RemoteLlmExecutionTools';
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import type { CacheLlmToolsOptions } from '../utils/cache/CacheLlmToolsOptions';
import { countUsage } from '../utils/count-total-usage/countUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';

type ProvideLlmToolsForWizardOrCliOptions = {
    /**
     * If true, user will be always prompted for login
     *
     * Note: This is used in `ptbk login` command
     */
    isLoginloaded?: true;
} & Pick<CacheLlmToolsOptions, 'isCacheReloaded'> &
    (
        | {
              /**
               * Use local keys and execute LLMs directly
               */
              readonly strategy: 'BRING_YOUR_OWN_KEYS';
          }
        | {
              /**
               * Do not use local keys but login to Promptbook server and execute LLMs there
               */
              readonly strategy: 'REMOTE_SERVER';

              /**
               * URL of the remote server
               *
               * @default `DEFAULT_REMOTE_SERVER_URL`
               */
              readonly remoteServerUrl?: string_url;

              /**
               * Identifier of the application which will be passed to the remote server identification
               *
               * Note: This can be some id or some semantic name like "email-agent"
               */
              readonly appId: string_app_id;

              /**
               *
               *
               * Note: When login prompt fails, `process.exit(1)` is called
               */
              loginPrompt(): Promisable<Identification<chococake>>;
          }
    );

/**
 * Returns LLM tools for CLI
 *
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access `.env` file and also writes this .env file
 *
 * @private within the repository - for CLI utils
 */
export async function $provideLlmToolsForWizardOrCli(
    options?: ProvideLlmToolsForWizardOrCliOptions,
): Promise<LlmExecutionToolsWithTotalUsage> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForWizardOrCli` works only in Node.js environment',
        );
    }

    options = options ?? { strategy: 'BRING_YOUR_OWN_KEYS' };
    const { isLoginloaded, strategy, isCacheReloaded } = options;

    let llmExecutionTools: LlmExecutionTools;

    if (strategy === 'REMOTE_SERVER') {
        const { remoteServerUrl = DEFAULT_REMOTE_SERVER_URL, loginPrompt } = options;

        const storage = new $EnvStorage<string_promptbook_token>();

        let key = `PROMPTBOOK_TOKEN`;

        if (remoteServerUrl !== DEFAULT_REMOTE_SERVER_URL) {
            key = `${key}_${remoteServerUrl.replace(/^https?:\/\//i, '')}`;
        }

        let identification: Identification<chococake> | null = null;
        let promptbookToken = await storage.getItem(key);

        if (promptbookToken === null || isLoginloaded) {
            identification = await loginPrompt();

            // Note: When login prompt fails, `process.exit(1)` is called so no need to check for null

            if (identification.isAnonymous === false) {
                promptbookToken = identificationToPromptbookToken(identification);
                await storage.setItem(key, promptbookToken);
            }
        } else {
            identification = promptbookTokenToIdentification(promptbookToken);
        }

        llmExecutionTools = new RemoteLlmExecutionTools({
            remoteServerUrl,
            identification,
        });
    } else if (strategy === 'BRING_YOUR_OWN_KEYS') {
        llmExecutionTools = await $provideLlmToolsFromEnv({
            title: 'LLM Tools for wizard or CLI with BYOK strategy',
        });
    } else {
        throw new UnexpectedError(`\`$provideLlmToolsForWizardOrCli\` wrong strategy "${strategy}"`);
    }

    return cacheLlmTools(
        countUsage(
            //        <- TODO: [🌯] We dont use countUsage at all, maybe just unwrap it
            //        <- Note: for example here we don`t want the [🌯]
            llmExecutionTools,
        ),
        {
            storage: new FileCacheStorage(
                { fs: $provideFilesystemForNode() },
                {
                    rootFolderPath: join(
                        process.cwd(),
                        DEFAULT_EXECUTION_CACHE_DIRNAME, // <- TODO: [🦒] Allow to override (pass different value into the function)
                    ),
                },
            ),
            isCacheReloaded,
        },
    );
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
 * TODO: [🥃] Allow `ptbk make` without llm tools
 * TODO: This should be maybe not under `_common` but under `utils-internal` / `utils/internal`
 * TODO: [®] DRY Register logic
 */
