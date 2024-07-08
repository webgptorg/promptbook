import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { KnowledgeJson } from '../../../types/PipelineJson/KnowledgeJson';
import type { string_base64 } from '../../../types/typeAliases';
import { just } from '../../../utils/just';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgeFromPdfOptions = {
    /**
     * The source of the knowledge in PDF format
     */
    content: string_base64 /* <- TODO: [🖖] Always the file, allow base64+filename+identification+mime or blob+filename+identification or file+identification */;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     */
    llmTools: LlmExecutionTools;
};

export async function prepareKnowledgeFromPdf(options: PrepareKnowledgeFromPdfOptions): Promise<KnowledgeJson> {
    const { content, llmTools } = options;

    /*
    [🧺]
    if (content.type !== 'application/pdf') {
        throw new Error('The content is not a PDF file');
    }
    */

    // TODO: !!! Convert PDF to markdown
    just(content);

    return prepareKnowledgeFromMarkdown({ content: '!!! Convert PDF to markdown', llmTools });
}

/**
 * TODO: [🧺] In future, content can be alse File or Blob BUT for now for wider compatibility its only base64
 *       @see https://stackoverflow.com/questions/14653349/node-js-cant-create-blobs
 */
