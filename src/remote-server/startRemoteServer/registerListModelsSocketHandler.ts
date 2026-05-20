import colors from 'colors';
import type { Socket } from 'socket.io';
import type { PromptbookServer_ListModels_Request } from '../socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from '../socket-types/listModels/PromptbookServer_ListModels_Response';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import type { SocketResponse } from './SocketResponse';
import { getExecutionToolsFromIdentification } from './getExecutionToolsFromIdentification';
import { respondToSocketRequest } from './respondToSocketRequest';

/**
 * Registers the socket list-models request handler.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerListModelsSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    // TODO: [👒] Listing models (and checking configuration) probably should go through REST API not Socket.io
    socket.on('listModels-request', async (request: PromptbookServer_ListModels_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Listing models`));
        }

        await respondToSocketRequest(socket, async () => createListModelsSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for listing available models.
 */
async function createListModelsSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_ListModels_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_ListModels_Response>> {
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, request.identification);
    const models = await tools.llm.listModels();

    return {
        eventName: 'listModels-response',
        payload: { models } satisfies PromptbookServer_ListModels_Response /* <- Note: [🤛] */,
    };
}
