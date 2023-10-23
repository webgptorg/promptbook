import { uuid } from '../../../../../../../../../utils/typeAliases';
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
