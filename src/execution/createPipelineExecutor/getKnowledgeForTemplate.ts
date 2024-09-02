import { PipelineJson } from '../../_packages/types.index';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import { string_markdown, string_parameter_value } from '../../types/typeAliases';
import { TODO_USE } from '../../utils/organization/TODO_USE';

export async function getKnowledgeForTemplate(
    preparedPipeline: PipelineJson,
    template: TemplateJson,
): Promise<string_parameter_value & string_markdown> {
    // TODO: [♨] Implement Better - use real index and keyword search from `template` and {samples}

    TODO_USE(template);
    return preparedPipeline.knowledgePieces.map(({ content }) => `- ${content}`).join('\n');
    //                                                      <- TODO: [🧠] Some smart aggregation of knowledge pieces, single-line vs multi-line vs mixed
}
