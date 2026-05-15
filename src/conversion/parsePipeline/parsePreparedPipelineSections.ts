import { spaceTrim } from 'spacetrim';
import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { MarkdownSection } from '../../utils/markdown/parseMarkdownSection';
import { parseMarkdownSection } from '../../utils/markdown/parseMarkdownSection';
import { splitMarkdownIntoSections } from '../../utils/markdown/splitMarkdownIntoSections';
import type { PipelineString } from '../../pipeline/PipelineString';
import { getPipelineIdentification } from './getPipelineIdentification';

/**
 * Parsed markdown structure split into the pipeline head and task sections.
 *
 * @private internal type of `parsePipeline`
 */
export type ParsedPipelineSections = {
    readonly pipelineHead: MarkdownSection;
    readonly pipelineSections: ReadonlyArray<MarkdownSection>;
};

/**
 * Splits the prepared markdown into the pipeline head and task sections.
 *
 * @private internal utility of `parsePipeline`
 */
export function parsePreparedPipelineSections(
    pipelineString: PipelineString,
    $pipelineJson: $PipelineJson,
): ParsedPipelineSections {
    const [pipelineHead, ...pipelineSections] =
        splitMarkdownIntoSections(pipelineString).map(parseMarkdownSection); /* <- Note: [🥞] */

    assertPipelineSectionsStructure(pipelineHead, pipelineSections, $pipelineJson);

    return {
        pipelineHead,
        pipelineSections,
    };
}

/**
 * Ensures the flattened markdown has exactly one h1 head followed by only h2 sections.
 *
 * @private internal utility of `parsePreparedPipelineSections`
 */
function assertPipelineSectionsStructure(
    pipelineHead: MarkdownSection | undefined,
    pipelineSections: ReadonlyArray<MarkdownSection>,
    $pipelineJson: $PipelineJson,
): asserts pipelineHead is MarkdownSection {
    if (pipelineHead === undefined) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Pipeline head is not defined

                    ${block(getPipelineIdentification($pipelineJson))}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }

    if (pipelineHead.level !== 1) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Pipeline head is not h1

                    ${block(getPipelineIdentification($pipelineJson))}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }

    if (!pipelineSections.every((pipelineSection) => pipelineSection.level === 2)) {
        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Not every pipeline section is h2

                    ${block(getPipelineIdentification($pipelineJson))}

                    This should never happen, because the pipeline already flattened
                `,
            ), // <- TODO: [🚞]
        );
    }
}
