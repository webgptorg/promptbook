import { RemoteServerOptions } from '../_packages/remote-client.index';
import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { preparePipelineOnRemoteServer } from '../prepare/preparePipelineOnRemoteServer';
import { parsePipeline } from './parsePipeline';

/**
 * Compile pipeline from string (markdown) format to JSON format
 *
 * @see https://github.com/webgptorg/promptbook/discussions/196
 *
 * Note: This function does not validate logic of the pipeline only the parsing
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.book.md)
 * @param options - Options for remote server compilation
 * @returns {Promptbook} compiled in JSON format (.book.json)
 * @throws {ParseError} if the promptbook string is not valid
 * @public exported from `@promptbook/remote-client`
 */
export async function compilePipelineOnRemoteServer<TCustomOptions = undefined>(
    pipelineString: PipelineString,
    options: RemoteServerOptions<TCustomOptions>,
): Promise<PipelineJson> {
    let pipelineJson = parsePipeline(pipelineString);

    pipelineJson = await preparePipelineOnRemoteServer(pipelineJson, options);

  
    // Note: No need to use `$exportJson` because `parsePipeline` and `preparePipeline` already do that
    return pipelineJson;
}
