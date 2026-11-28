import colors from 'colors';
import { Server, Socket } from 'socket.io';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import { registerListModelsSocketHandler } from './registerListModelsSocketHandler';
import { registerPreparePipelineSocketHandler } from './registerPreparePipelineSocketHandler';
import { registerPromptSocketHandler } from './registerPromptSocketHandler';

/**
 * Registers socket connection lifecycle handlers and per-event request handlers.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerRemoteServerSocketHandlers<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    server: Server,
): void {
    server.on('connection', (socket: Socket) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.gray(`Client connected`), socket.id);
        }

        registerPromptSocketHandler(runtime, socket);
        registerListModelsSocketHandler(runtime, socket);
        registerPreparePipelineSocketHandler(runtime, socket);

        socket.on('disconnect', () => {
            // TODO: Destroy here executionToolsForClient
            if (runtime.configuration.isVerbose) {
                console.info(colors.gray(`Client disconnected`), socket.id);
            }
        });
    });
}
