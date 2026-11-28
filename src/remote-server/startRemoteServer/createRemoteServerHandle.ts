import express from 'express';
import http from 'http';
import { DefaultEventsMap, Server } from 'socket.io';
import type { RemoteServer } from '../RemoteServer';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { TODO_narrow } from '../../utils/organization/TODO_narrow';

/**
 * Creates the public RemoteServer handle with lazily exposed internals.
 *
 * @private internal utility of `startRemoteServer`
 */
export function createRemoteServerHandle(app: express.Express, httpServer: http.Server, server: Server): RemoteServer {
    let isDestroyed = false;

    return {
        get httpServer(): http.Server<TODO_any> {
            return httpServer;
        },

        get expressApp(): express.Express {
            return app;
        },

        get socketIoServer(): Server<
            TODO_narrow<DefaultEventsMap>,
            TODO_narrow<DefaultEventsMap>,
            TODO_narrow<DefaultEventsMap>,
            TODO_any
        > {
            return server;
        },

        get isDestroyed() {
            return isDestroyed;
        },
        destroy() {
            if (isDestroyed) {
                return;
            }
            isDestroyed = true;
            httpServer.close();
            server.close();
        },
    };
}
