import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { CONNECTION_RETRIES_LIMIT } from '../config';
import { CONNECTION_TIMEOUT_MS } from '../config';
import type { RemoteClientOptions } from './types/RemoteClientOptions';

/**
 * Creates a connection to the remote proxy server.
 *
 * Note: This function creates a connection to the remote server and returns a socket but responsibility of closing the connection is on the caller
 *
 * @private internal utility function
 */
export async function createRemoteClient<TCustomOptions = undefined>(
    options: RemoteClientOptions<TCustomOptions>,
): Promise<Socket> {
    const { remoteUrl, path } = options;

    return new Promise((resolve, reject) => {
        const socket = io(remoteUrl, {
            retries: CONNECTION_RETRIES_LIMIT,
            timeout: CONNECTION_TIMEOUT_MS,
            path,
            // path: `${this.remoteUrl.pathname}/socket.io`,
            transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
        });

        // console.log('Connecting to', this.options.remoteUrl.href, { socket });

        socket.on('connect', () => {
            resolve(socket);
        });

        // TODO: [💩] Better timeout handling

        setTimeout(() => {
            reject(new Error(`Timeout while connecting to ${remoteUrl}`));
        }, CONNECTION_TIMEOUT_MS);
    });
}
