import type { IDestroyable } from 'destroyable';
import { Elysia } from 'elysia';
import { DefaultEventsMap, Server } from 'socket.io';
import type { TODO_any } from '../utils/organization/TODO_any';
import type { TODO_narrow } from '../utils/organization/TODO_narrow';

export type RemoteServer = IDestroyable & {
    /*
    TODO: [🧠][🚟] Should be this exposed
    /* HTTP server instance
    import http from 'http';
    readonly httpServer: http.Server<TODO_any>;
    */

    /**
     * Elysia application instance
     *
     * Note: This is useful for adding custom routes
     */
    readonly elisiaApp: Elysia<TODO_any>;

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
