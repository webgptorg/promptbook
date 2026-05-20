import type { Socket } from 'socket.io';
import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { PromptbookServer_Error } from '../socket-types/_common/PromptbookServer_Error';
import type { SocketResponse } from './SocketResponse';

/**
 * Executes one socket request and guarantees consistent error emission and cleanup.
 *
 * @private internal utility of `startRemoteServer`
 */
export async function respondToSocketRequest<TPayload>(
    socket: Socket,
    createResponse: () => Promise<SocketResponse<TPayload>>,
): Promise<void> {
    try {
        const { eventName, payload } = await createResponse();
        socket.emit(eventName, payload);
    } catch (error) {
        assertsError(error);

        socket.emit('error', serializeError(error) satisfies PromptbookServer_Error /* <- Note: [🤛] */);
    } finally {
        socket.disconnect();
        // TODO: [🍚]> executionTools.destroy();
    }
}
