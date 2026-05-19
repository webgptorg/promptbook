import http from 'http';
import { Server } from 'socket.io';

/**
 * Creates the Socket.io server with the existing transport and CORS settings.
 *
 * @private internal utility of `startRemoteServer`
 */
export function createSocketServer(httpServer: http.Server): Server {
    return new Server(httpServer, {
        path: '/socket.io',
        transports: ['polling', 'websocket' /*, <- TODO: [🌬] Allow to pass `transports`, add 'webtransport' */],
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            // <- TODO: [🌡] Allow to pass
        },
    });
}

