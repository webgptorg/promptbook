import type { PipelineJson } from '../pipeline/PipelineJson/PipelineJson';
import type { PipelineString } from '../pipeline/PipelineString';
import { applyPipelineHead } from './parsePipeline/applyPipelineHead';
import { createInitialPipelineJson } from './parsePipeline/createInitialPipelineJson';
import { createUniqueSectionNameResolver } from './parsePipeline/createUniqueSectionNameResolver';
import { finalizeParsedPipeline } from './parsePipeline/finalizeParsedPipeline';
import { parsePreparedPipelineSections } from './parsePipeline/parsePreparedPipelineSections';
import { preparePipelineString } from './parsePipeline/preparePipelineString';
import { processPipelineSection } from './parsePipeline/processPipelineSection';

/**
 * Compile pipeline from string (markdown) format to JSON format synchronously
 *
 * Note: There are 3 similar functions:
 * - `compilePipeline` **(preferred)** - which properly compiles the promptbook and uses embedding for external knowledge
 * - `parsePipeline` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 * - `preparePipeline` - just one step in the compilation process
 *
 * Note: This function does not validate logic of the pipeline only the parsing
 * Note: This function acts as compilation process
 *
 * @param pipelineString {Promptbook} in string markdown format (.book.md)
 * @returns {Promptbook} compiled in JSON format (.bookc)
 * @throws {ParseError} if the promptbook string is not valid
 *
 * @public exported from `@promptbook/core`
 */
export function parsePipeline(pipelineString: PipelineString): PipelineJson {
    const $pipelineJson = createInitialPipelineJson(pipelineString);
    const preparedPipelineString = preparePipelineString(pipelineString, $pipelineJson);
    const { pipelineHead, pipelineSections } = parsePreparedPipelineSections(preparedPipelineString, $pipelineJson);
    const getUniqueSectionName = createUniqueSectionNameResolver(pipelineSections);

    applyPipelineHead(pipelineHead, $pipelineJson);

    for (const pipelineSection of pipelineSections) {
        processPipelineSection(pipelineSection, $pipelineJson, getUniqueSectionName);
    }

    return finalizeParsedPipeline($pipelineJson);
}

// TODO: [🧠] Maybe more things here can be refactored as high-level abstractions
// TODO: [main] !!4 Warn if used only sync version
// TODO: [🚞] Report here line/column of error
