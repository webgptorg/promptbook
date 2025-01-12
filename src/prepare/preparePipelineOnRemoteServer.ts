import { RemoteServerOptions } from '../_packages/remote-client.index';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
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
    options: RemoteServerOptions<TCustomOptions>,
): Promise<PipelineJson> {
    // TODO: !!!!!! Implement
    TODO_USE(options);

    // TODO: !!!!!!  do $exportJson
    return pipeline;
}
