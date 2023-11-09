import { string_uri, uuid } from '../../../.././types/typeAliases';
import { CommonExecutionToolsOptions } from '../../../CommonExecutionToolsOptions';

/**
 * Options for RemoteNaturalExecutionTools
 */
export interface RemoteNaturalExecutionToolsOptions extends CommonExecutionToolsOptions {
    /**
     * URL of the remote PTP server
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
    readonly clientId: uuid;
}
