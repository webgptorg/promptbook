import colors from 'colors';
import type { Socket } from 'socket.io';
import { preparePipeline } from '../../prepare/preparePipeline';
import type { PromptbookServer_PreparePipeline_Request } from '../socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import type { PromptbookServer_PreparePipeline_Response } from '../socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import type { SocketResponse } from './SocketResponse';
import { getExecutionToolsFromIdentification } from './getExecutionToolsFromIdentification';
import { respondToSocketRequest } from './respondToSocketRequest';

/**
 * Registers the socket prepare-pipeline request handler.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerPreparePipelineSocketHandler<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    socket: Socket,
): void {
    // TODO: [👒] Listing models (and checking configuration) probably should go through REST API not Socket.io
    socket.on('preparePipeline-request', async (request: PromptbookServer_PreparePipeline_Request<TCustomOptions>) => {
        if (runtime.configuration.isVerbose) {
            console.info(colors.bgWhite(`Prepare pipeline`));
        }

        await respondToSocketRequest(socket, async () => createPreparePipelineSocketResponse(runtime, request));
    });
}

/**
 * Creates the socket response for preparePipeline.
 */
async function createPreparePipelineSocketResponse<TCustomOptions>(
    runtime: RemoteServerRuntime<TCustomOptions>,
    request: PromptbookServer_PreparePipeline_Request<TCustomOptions>,
): Promise<SocketResponse<PromptbookServer_PreparePipeline_Response>> {
    const tools = await getExecutionToolsFromIdentification(runtime.configuration, request.identification);
    const preparedPipeline = await preparePipeline(request.pipeline, tools, runtime.configuration.startOptions);

    return {
        eventName: 'preparePipeline-response',
        payload: { preparedPipeline } satisfies PromptbookServer_PreparePipeline_Response /* <- Note: [🤛] */,
    };
}

