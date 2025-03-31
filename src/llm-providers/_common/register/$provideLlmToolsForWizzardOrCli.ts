import { join } from 'path';
import { DEFAULT_EXECUTION_CACHE_DIRNAME, DEFAULT_REMOTE_SERVER_URL } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import { FileCacheStorage } from '../../../storage/file-cache-storage/FileCacheStorage';
import { string_app_id, string_token, string_url, string_user_id } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { RemoteLlmExecutionTools } from '../../remote/RemoteLlmExecutionTools';
import { cacheLlmTools } from '../utils/cache/cacheLlmTools';
import type { CacheLlmToolsOptions } from '../utils/cache/CacheLlmToolsOptions';
import { countUsage } from '../utils/count-total-usage/countUsage';
import type { LlmExecutionToolsWithTotalUsage } from '../utils/count-total-usage/LlmExecutionToolsWithTotalUsage';
import { $provideLlmToolsFromEnv } from './$provideLlmToolsFromEnv';

type ProvideLlmToolsForWizzardOrCliOptions = Pick<CacheLlmToolsOptions, 'isCacheReloaded'> &
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
               * @default 'promptbook-wizzard'
               */
              readonly appId: string_app_id;

              /**
               *
               */
              loginPrompt(): {
                  /**
                   * User id to be stored in the `.promptbook` folder and used for authentication
                   */
                  readonly userId: string_user_id;

                  /**
                   * Token to be stored in the `.promptbook` folder and used for authentication
                   */
                  readonly userToken: string_token;

                  /**
                   * Used as additional information about the user
                   */
                  readonly username?: string;
              };
          }
    );

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export async function $provideLlmToolsForWizzardOrCli(
    options?: ProvideLlmToolsForWizzardOrCliOptions,
): Promise<LlmExecutionToolsWithTotalUsage> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            'Function `$provideLlmToolsForWizzardOrCli` works only in Node.js environment',
        );
    }

    options = options ?? { strategy: 'BRING_YOUR_OWN_KEYS' };
    const { strategy, isCacheReloaded } = options;

    let llmExecutionTools: LlmExecutionTools;

    if (strategy === 'REMOTE_SERVER') {
        const { remoteServerUrl = DEFAULT_REMOTE_SERVER_URL, appId = 'promptbook-wizzard', loginPrompt } = options;


        const credentials = await store.getItem(`${remoteServerUrl}-${appId}-credentials`);


        if(credentials===null){
          const { userId, userToken, username } = await loginPrompt();

          


          await  store.setItem(`${remoteServerUrl}-${appId}-credentials`, { userId, userToken, username });
        }

        const { userId, userToken, username } = await loginPrompt();

        const { userId, userToken, username } = await loginPrompt();

        // TODO: !!!!!! Save userToken and username to the .promptbook folder
        TODO_USE(username);

        new RemoteLlmExecutionTools({
            remoteServerUrl,
            identification: {
                isAnonymous: false,
                appId,
                userId,
                userToken,
            },
        });
    } else if (strategy === 'BRING_YOUR_OWN_KEYS') {
        llmExecutionTools = await $provideLlmToolsFromEnv();
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
