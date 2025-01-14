import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { string_base_url } from '../../types/typeAliases';
import type { string_uri } from '../../types/typeAliases';
import type { PromptbookServer_Identification } from '../socket-types/_subtypes/PromptbookServer_Identification';

/**
 * Options for `RemoteLlmExecutionTools`
 *
 * @public exported from `@promptbook/remote-client`
 */
export type RemoteClientOptions<TCustomOptions> = CommonToolsOptions & {
    /**
     * URL of the remote server
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
     * Identification of client for Socket.io remote server
     */
    readonly identification: PromptbookServer_Identification<TCustomOptions>;
};

/**
 * TODO: Pass more options from Socket.io to `RemoteClientOptions` (like `transports`)
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🧠][🧜‍♂️] Maybe join remoteUrl and path into single value
 */
