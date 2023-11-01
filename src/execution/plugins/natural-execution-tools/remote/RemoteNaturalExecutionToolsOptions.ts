import { uuid } from '../../../.././types/typeAliases';
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
     * Your client ID
     */
    readonly clientId: uuid;
}

/**
 * TODO: [👦] Allow to enable/disable streaming and reporting
 */
