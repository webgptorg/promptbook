import type { CommonToolsOptions } from '../../../execution/CommonToolsOptions';
import type { string_base_url } from '../../../types/typeAliases';
import type { string_uri } from '../../../types/typeAliases';
import type { string_user_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/register/LlmToolsConfiguration';
import type { CollectionRemoteServerClientOptions } from './RemoteServerOptions';

/**
 * Options for `RemoteLlmExecutionTools`
 *
 * @public exported from `@promptbook/remote-client`
 */
export type RemoteLlmExecutionToolsOptions<TCustomOptions> = CommonToolsOptions & {
    /**
     * URL of the remote PROMPTBOOK server
     * On this server will be connected to the socket.io server
     */
    readonly remoteUrl: string_base_url;

    /**
     * Path for the Socket.io server to listen
     *
     * @default '/socket.io'
     * @example '/promptbook/socket.io'
     */
    readonly path: string_uri;

    /**
     * Mode of the server to connect to
     */
    isAnonymous: boolean;
} & (
        | {
              /**
               * Use anonymous server with anonymous mode
               */
              readonly isAnonymous: true;

              /**
               * Configuration for the LLM tools
               */
              readonly llmToolsConfiguration: LlmToolsConfiguration;

              /**
               * Identifier of the end user
               *
               * Note: This is passed to the certain model providers to identify misuse
               * Note: In anonymous mode, there is no need to identify yourself, nor does it change the actual configuration of LLM Tools (unlike in collection mode).
               */
              readonly userId: string_user_id | null;
          }
        | ({
              /**
               * Use anonymous server with client identification and fixed collection
               */
              readonly isAnonymous: false;
          } & CollectionRemoteServerClientOptions<TCustomOptions>)
    );

/**
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🧠][🧜‍♂️] Maybe join remoteUrl and path into single value
 */
