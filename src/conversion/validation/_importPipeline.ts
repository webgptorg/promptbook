import { readFile } from 'fs/promises';
import { join } from 'path';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../../pipeline/PipelineString';
import { validatePipelineString } from '../../pipeline/validatePipelineString';
import { unpreparePipeline } from '../../prepare/unpreparePipeline';
import type { string_filename } from '../../types/typeAliases';
import { loadArchive } from '../archive/loadArchive';

/**
 * Import the pipeline.book or pipeline.bookc file
 *
 * Note: Using here custom import to work in jest tests
 * Note: Using sync version is 💩 in the production code, but it's ok here in tests
 *
 * @param path - The path to the file relative to examples/pipelines directory
 * @private internal function of tests
 */
export async function importPipelineWithoutPreparation(path: `${string}.book`): Promise<PipelineString>;
export async function importPipelineWithoutPreparation(path: `${string}.bookc`): Promise<PipelineJson>;
export async function importPipelineWithoutPreparation(path: string_filename): Promise<PipelineString | PipelineJson> {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config
    const filePath = join(__dirname, examplesDir, path);

    if (path.endsWith('.bookc')) {
        const pipelines = await loadArchive(filePath, $provideFilesystemForNode());

        if (pipelines.length !== 1) {
            throw new Error('The archive must contain exactly one pipeline');
        }

        let pipeline = pipelines[0]!;

        pipeline = unpreparePipeline(pipeline);
        return pipeline;
    } else if (path.endsWith('.book')) {
        const content = await readFile(filePath, 'utf-8');

        return validatePipelineString(content);
    } else {
        throw new Error('This should be used only for .book.md or .bookc files');
    }
}

/**
 * Import the pipeline.bookc file as parsed JSON
 *
 * @private internal function of tests
 */
export async function importPipelineJson(path: `${string}.bookc`): Promise<PipelineJson> {
    const examplesDir = '../../../examples/pipelines'; // <- TODO: [🚏] DRY, to config

    const pipelines = await loadArchive(join(__dirname, examplesDir, path), $provideFilesystemForNode());

    if (pipelines.length !== 1) {
        throw new Error('The archive must contain exactly one pipeline');
    }

    const pipeline = pipelines[0]!;

    return pipeline;
}

/*
TODO: [👩🏽‍🤝‍🧑🏾]
/**
 * Import the pipeline.bookc file as string
 *
 * @private internal function of tests
 * /
export async function importPipelineJsonAsString(path: `${string}.bookc`): Promise<string_json<PipelineJson>> {
}
*/

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [⚫] Code in this file should never be published in any package
 */
