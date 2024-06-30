import { KnowledgeJson, LlmExecutionTools, string_markdown } from '../../../_packages/types.index';
import { just } from '../../../utils/just';

export async function prepareKnowledgeFromMarkdown(options: {
    content: string_markdown;
    llmTools: LlmExecutionTools;
}): Promise<KnowledgeJson> {
    const { content, llmTools } = options;

    just(content);
    just(llmTools);

    return [];
}
