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
    const { remoteServerUrl } = options;

    console.log('!!! Connecting to socket.io server', remoteServerUrl, {
        retries: CONNECTION_RETRIES_LIMIT,
        timeout: CONNECTION_TIMEOUT_MS,
        path: '/socket.io',
    });

    return new Promise((resolve, reject) => {
        const socket = io(remoteServerUrl, {
            retries: CONNECTION_RETRIES_LIMIT,
            timeout: CONNECTION_TIMEOUT_MS,
            path: '/socket.io',
            transports: ['polling', 'websocket' /*, <- TODO: [🌬] Allow to pass `transports`, add 'webtransport' */],
        });

        // console.log('Connecting to', this.options.remoteServerUrl.href, { socket });

        socket.on('connect', () => {
            resolve(socket);
        });

        // TODO: [💩] Better timeout handling

        setTimeout(() => {
            reject(new Error(`Timeout while connecting to ${remoteServerUrl}`));
        }, CONNECTION_TIMEOUT_MS);
    });
}
