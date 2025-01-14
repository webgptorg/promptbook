import { deserializeError } from '../_packages/utils.index';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import { createRemoteClient } from '../remote-server/createRemoteClient';
import { PromptbookServer_Error } from '../remote-server/socket-types/_common/PromptbookServer_Error';
import { PromptbookServer_PreparePipeline_Request } from '../remote-server/socket-types/prepare/PromptbookServer_PreparePipeline_Request';
import { PromptbookServer_PreparePipeline_Response } from '../remote-server/socket-types/prepare/PromptbookServer_PreparePipeline_Response';
import { RemoteClientOptions } from '../remote-server/types/RemoteClientOptions';
import { TODO_USE } from '../utils/organization/TODO_USE';

/**
 * Prepare pipeline on remote server
 *
 * @see https://github.com/webgptorg/promptbook/discussions/196
 *
 * Note: This function does not validate logic of the pipeline
 * Note: This function acts as part of compilation process
 * Note: When the pipeline is already prepared, it returns the same pipeline
 *
 * @public exported from `@promptbook/remote-client`
 */
export async function preparePipelineOnRemoteServer<TCustomOptions = undefined>(
    pipeline: PipelineJson,
    options: RemoteClientOptions<TCustomOptions>,
): Promise<PipelineJson> {
    // TODO: !!!!!! Implement
    TODO_USE(options);

    const socket = await createRemoteClient(options);

    socket.emit(
        'preparePipeline-request',
        {
            identification: options.identification,
            pipeline,
        } satisfies PromptbookServer_PreparePipeline_Request<TCustomOptions> /* <- Note: [🤛] */,
    );

    const preparedPipeline = await new Promise<PipelineJson>((resolve, reject) => {
        socket.on('preparePipeline-response', (response: PromptbookServer_PreparePipeline_Response) => {
            resolve(response.preparedPipeline);
            socket.disconnect();
        });
        socket.on('error', (error: PromptbookServer_Error) => {
            reject(deserializeError(error));
            socket.disconnect();
        });
    });

    socket.disconnect();

    // TODO: !!!!!!  do $exportJson
    return preparedPipeline;
}

/**
 * TODO: !!!! Do not return Promise<PipelineJson> But PreparePipelineTask
 */
