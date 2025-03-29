import type { IDestroyable } from 'destroyable';
import express from 'express';
import http from 'http';
import { DefaultEventsMap, Server } from 'socket.io';
import { TODO_any } from '../_packages/types.index';
import { TODO_narrow } from '../utils/organization/TODO_narrow';

export type RemoteServer = IDestroyable & {
    /**
     * HTTP server instance
     */
    readonly httpServer: http.Server<TODO_any>;

    /**
     * Express application instance
     *
     * Note: This is useful for adding custom routes
     */
    readonly expressApp: express.Express;

    /**
     * Socket.io server instance
     */
    readonly socketIoServer: Server<
        TODO_narrow<DefaultEventsMap>,
        TODO_narrow<DefaultEventsMap>,
        TODO_narrow<DefaultEventsMap>,
        TODO_any
    >;
};
