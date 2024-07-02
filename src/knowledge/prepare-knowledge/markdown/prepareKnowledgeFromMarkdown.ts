// import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { KnowledgeJson } from '../../../types/PromptbookJson/KnowledgeJson';
import type { string_markdown } from '../../../types/typeAliases';
import { just } from '../../../utils/just';
// import prepareKnowledgeFromMarkdownStringPromptbook from './prepare-knowledge-from-markdown.ptbk.md';

export async function prepareKnowledgeFromMarkdown(options: {
    content: string_markdown;
    llmTools: LlmExecutionTools;
}): Promise<KnowledgeJson> {
    const { content, llmTools } = options;

    // const promptbook =await promptbookStringToJson(prepareKnowledgeFromMarkdownStringPromptbook);

    just(content);
    just(llmTools);

    return [];
}
