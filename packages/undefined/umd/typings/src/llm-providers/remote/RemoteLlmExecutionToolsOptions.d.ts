import type { CommonExecutionToolsOptions } from '../../execution/CommonExecutionToolsOptions';
import type { client_id } from '../../types/typeAliases';
import type { string_uri } from '../../types/typeAliases';
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
    readonly remoteUrl: URL;
    /**
     * Path for the Socket.io server to listen
     *
     * @default '/socket.io'
     * @example '/promptbook/socket.io'
     */
    readonly path: string_uri;
    /**
     * Your client ID
     */
    readonly clientId: client_id;
};
