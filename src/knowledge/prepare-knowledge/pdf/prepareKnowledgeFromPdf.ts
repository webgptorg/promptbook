import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { KnowledgeJson } from '../../../types/PromptbookJson/KnowledgeJson';
import { just } from '../../../utils/just';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgeFromPdfOptions = {
    /**
     * The source of the knowledge in PDF format
     */
    content: File | Blob;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     */
    llmTools: LlmExecutionTools;
};

export async function prepareKnowledgeFromPdf(options: PrepareKnowledgeFromPdfOptions): Promise<KnowledgeJson> {
    const { content, llmTools } = options;

    if (content.type !== 'application/pdf') {
        throw new Error('The content is not a PDF file');
    }

    // TODO: !!! Convert PDF to markdown
    just(content);

    return prepareKnowledgeFromMarkdown({ content: '!!! Convert PDF to markdown', llmTools });
}
