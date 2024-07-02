// import { promptbookStringToJson } from '../../../conversion/promptbookStringToJson';
import spaceTrim from 'spacetrim';
import type { IVectorData } from 'xyzt';
// !!!! Fix importing of JSON files> import promptbookLibrary from '../../../../promptbook-library/promptbook-library.json';
import { assertsExecutionSuccessful } from '../../../execution/assertsExecutionSuccessful';
import { createPromptbookExecutor } from '../../../execution/createPromptbookExecutor';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { createPromptbookLibraryFromSources } from '../../../promptbook-library/constructors/createPromptbookLibraryFromSources';
import type { KnowledgeJson } from '../../../types/PromptbookJson/KnowledgeJson';
// import type { PromptbookJson } from '../../../types/PromptbookJson/PromptbookJson';
import type {
    string_href,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_name,
} from '../../../types/typeAliases';
import type { string_keyword } from '../../../utils/normalization/IKeywords';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';

export async function prepareKnowledgeFromMarkdown(options: {
    content: string_markdown /* <- TODO: [🖖] Always the file */;
    llmTools: LlmExecutionTools;
}): Promise<KnowledgeJson> {
    const { content, llmTools } = options;

    const library = await createPromptbookLibraryFromSources(
        /* !!!! ...(promptbookLibrary as Array<PromptbookJson>)*/ {
            title: 'Prepare Knowledge from Markdown',
            promptbookUrl: 'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md',
            promptbookVersion: '0.59.0-5',
            parameters: [
                { name: 'content', description: 'Markdown document content', isInput: true, isOutput: false },
                { name: 'knowledge', description: 'The knowledge JSON object', isInput: false, isOutput: true },
            ],
            promptTemplates: [
                {
                    name: 'knowledge',
                    title: 'Knowledge',
                    dependentParameterNames: ['content'],
                    executionType: 'PROMPT_TEMPLATE',
                    modelRequirements: { modelVariant: 'CHAT', modelName: 'claude-3-opus-20240229' },
                    content:
                        'You are experienced data researcher, extract the important knowledge from the document.\n\n# Rules\n\n-   Make pieces of information concise, clear, and easy to understand\n-   One piece of information should be approximately 1 paragraph\n-   Divide the paragraphs by markdown horizontal lines ---\n-   Omit irrelevant information\n-   Group redundant information\n-   Write just extracted information, nothing else\n\n# The document\n\nTake information from this document:\n\n> {content}',
                    resultingParameterName: 'knowledge',
                },
            ],
            knowledge: [],
        },
    );
    const promptbook = library.getPromptbookByUrl(
        'https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.ptbk.md',
    );

    const executor = createPromptbookExecutor({
        promptbook,
        tools: {
            llm: llmTools,
            script: [
                /* <- TODO: Allow to just not define script tools */
            ],
        },
    });

    const result = await executor({ content });

    assertsExecutionSuccessful(result);

    const { outputParameters } = result;
    const { knowledge: knowledgeRaw } = outputParameters;

    const knowledgeTextPieces = (knowledgeRaw || '').split('\n---\n');

    const knowledge = await Promise.all(
        knowledgeTextPieces.map(async (knowledgeTextPiece, i) => {
            // Note: Theese are just default values, they will be overwritten by the actual values:
            let name: string_name = `piece-${i}`;
            let title: string_markdown_text = spaceTrim(knowledgeTextPiece.substring(0, 100));
            const content: string_markdown = spaceTrim(knowledgeTextPiece);
            const keywords: Array<string_keyword> = [];
            const index: Array<{ modelName: string_model_name; position: IVectorData }> = [];
            const sources: Array<{ title: string_markdown_text; href: string_href }> = [];

            try {
                // TODO: !!!! Summarize name and title from the content
                title = spaceTrim(knowledgeTextPiece.substring(0, 30));
                name = normalizeToKebabCase(title);

                // TODO: !!!! Extract keywords via prompt
                // TODO: !!!! Index through LLM model
                // TODO: [🖖] !!!! Make system for sources and identification of sources
            } catch (error) {
                console.error(error);
            }

            return {
                name,
                title,
                content,
                keywords,
                index,
                sources,
            };
        }),
    );

    return knowledge;
}
