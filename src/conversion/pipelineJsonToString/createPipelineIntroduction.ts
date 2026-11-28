import { spaceTrim } from 'spacetrim';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_markdown } from '../../types/string_markdown';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';

/**
 * Creates the initial markdown heading and description of a pipeline.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function createPipelineIntroduction(pipelineJson: PipelineJson): string_markdown {
    const { title, description } = pipelineJson;
    const pipelineIntroduction = spaceTrim(
        (block) => `
            # ${title}

            ${block(description || '')}
        `,
    );

    // TODO: [main] !!5 This increases size of the bundle and is probably not necessary
    return prettifyMarkdown(pipelineIntroduction);
}
