import type { LlmExecutionTools } from '../execution/LlmExecutionTools';
import { prepareKnowledgeFromMarkdown } from '../knowledge/prepare-knowledge/markdown/prepareKnowledgeFromMarkdown';
import type { PromptbookJson } from '../types/PromptbookJson/PromptbookJson';
import type { PromptbookString } from '../types/PromptbookString';
import { just } from '../utils/just';
import { promptbookStringToJsonSync } from './promptbookStringToJsonSync';

/**
 * Options for promptbookStringToJson
 */
type PromptbookStringToJsonOptions = {
    /**
     * Tools for processing required for knowledge processing *(not for actual execution)*
     */
    llmTools?: LlmExecutionTools;
};

/**
 * Compile promptbook from string (markdown) format to JSON format
 *
 * Note: There are two similar functions:
 * - `promptbookStringToJson` **(preferred)** - which propperly compiles the promptbook and use embedding for external knowledge
 * - `promptbookStringToJsonSync` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
 *
 * @param promptbookString {Promptbook} in string markdown format (.ptbk.md)
 * @param options - Options and tools for the compilation
 * @returns {Promptbook} compiled in JSON format (.ptbk.json)
 * @throws {PromptbookSyntaxError} if the promptbook string is not valid
 *
 * Note: This function does not validate logic of the pipeline only the syntax
 * Note: This function acts as compilation process
 */
export async function promptbookStringToJson(
    promptbookString: PromptbookString,
    options: PromptbookStringToJsonOptions = {},
): Promise<PromptbookJson> {
    const { llmTools } = options;

    // TODO: !!!! Use tools here to compile knowledge
    just(llmTools);

    if (llmTools) {
        const knowledge = await prepareKnowledgeFromMarkdown({
            content: 'Roses are red, violets are blue, programmers use Promptbook, users too',
            llmTools,
        });
        console.info('!!!! knowledge', knowledge);
    }

    // TODO: !!! Preconvert knowledge and error in promptbookStringToJsonSync if still present
    const promptbookJson = promptbookStringToJsonSync(promptbookString);

    return promptbookJson;
}

/**
 * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
 */
