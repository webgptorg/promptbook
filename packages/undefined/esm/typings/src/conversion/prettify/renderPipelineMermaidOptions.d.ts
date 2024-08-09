import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_href } from '../../types/typeAliases';
/**
 * Addtional options for rendering Mermaid graph
 */
export type renderPipelineMermaidOptions = {
    /**
     * Callback for creating from prompt template graph node
     */
    linkPromptTemplate?(promptTemplate: PromptTemplateJson): {
        href: string_href;
        title: string;
    } | null;
};
/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 *
 * @public exported from `@promptbook/utils`
 */
export declare function renderPromptbookMermaid(pipelineJson: PipelineJson, options?: renderPipelineMermaidOptions): string;
/**
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
