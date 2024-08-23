import type { CommonExecutionToolsOptions } from '../../../execution/CommonExecutionToolsOptions';
import type { string_base_url } from '../../../types/typeAliases';
import type { string_uri } from '../../../types/typeAliases';
import type { string_user_id } from '../../../types/typeAliases';
import type { LlmToolsConfiguration } from '../../_common/LlmToolsConfiguration';

/**
 * Options for `RemoteLlmExecutionTools`
 *
 * @public exported from `@promptbook/remote-client`
 */
export type RemoteLlmExecutionToolsOptions = CommonExecutionToolsOptions & {
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
              isAnonymous: true;

              /**
               * Configuration for the LLM tools
               */
              readonly llmToolsConfiguration: LlmToolsConfiguration;

              /**
               * Identifier of the end user
               *
               * Note: this is passed to the certain model providers to identify misuse
               * Note: In anonymous mode it is not required to identify
               */
              readonly userId?: string_user_id;
          }
        | {
              /**
               * Use anonymous server with client identification and fixed collection
               */
              isAnonymous: false;

              /**
               * Identifier of the end user
               *
               * Note: this is passed to the certain model providers to identify misuse
               */
              readonly userId: string_user_id;
          }
    );

/**
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🧠][🧜‍♂️] Maybe join remoteUrl and path into single value
 */
