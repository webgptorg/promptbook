import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import spaceTrim from 'spacetrim';
import { isValidUrl } from '../utils/validators/url/isValidUrl';
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

    if (!isValidUrl(remoteServerUrl)) {
        throw new Error(`Invalid \`remoteServerUrl\`: "${remoteServerUrl}"`);
    }

    const remoteServerUrlParsed = new URL(remoteServerUrl);

    if (remoteServerUrlParsed.pathname !== '/' && remoteServerUrlParsed.pathname !== '') {
        remoteServerUrlParsed.pathname = '/';
        throw new Error(
            spaceTrim(
                (block) =>
                    `
                        Remote server requires root url \`/\`

                        You have provided \`remoteServerUrl\`:
                        ${block(remoteServerUrl)}

                        But something like this is expected:
                        ${block(remoteServerUrlParsed.href)}

                        Note: If you need to run multiple services on the same server, use 3rd or 4th degree subdomain

                    `,
            ),
        );
    }

    return new Promise((resolve, reject) => {
        const socket = io(remoteServerUrl, {
            retries: CONNECTION_RETRIES_LIMIT,
            timeout: CONNECTION_TIMEOUT_MS,
            path: '/socket.io',
            transports: ['polling', 'websocket' /*, <- TODO: [🌬] Allow to pass `transports`, add 'webtransport' */],
        });

        // console.log('Connecting to', this.options.remoteServerUrl.href, { socket });

        let isResolved = false;

        socket.on('connect', () => {
            if (!isResolved) {
                isResolved = true;
                resolve(socket);
            }
        });

        socket.on('connect_error', (error) => {
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Failed to connect to ${remoteServerUrl}: ${error.message || error}`));
            }
        });

        socket.on('disconnect', (reason) => {
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Connection to ${remoteServerUrl} was disconnected: ${reason}`));
            }
        });

        // Better timeout handling with more descriptive error message
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                socket.disconnect();
                reject(new Error(
                    `Connection timeout after ${CONNECTION_TIMEOUT_MS / 1000} seconds while connecting to ${remoteServerUrl}. ` +
                    `This may indicate network issues or the server may be experiencing high load. ` +
                    `For authentication flows like social login, ensure sufficient time is allowed for user interaction.`
                ));
            }
        }, CONNECTION_TIMEOUT_MS);

        // Clean up timeout if connection succeeds
        socket.on('connect', () => {
            clearTimeout(timeoutId);
        });
    });
}
