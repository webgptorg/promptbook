import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptTemplateJson } from '../../types/PipelineJson/PromptTemplateJson';
import type { string_href } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { titleToName } from '../utils/titleToName';

/**
 * Addtional options for rendering Mermaid graph
 */
export type renderPipelineMermaidOptions = {
    /**
     * Callback for creating from prompt template graph node
     */
    linkPromptTemplate?(promptTemplate: PromptTemplateJson): { href: string_href; title: string } | null;
};

/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 */
export function renderPromptbookMermaid(pipelineJson: PipelineJson, options?: renderPipelineMermaidOptions): string {
    const { linkPromptTemplate = () => null } = options || {};

    const parameterNameToTemplateName = (parameterName: string_name) => {
        const parameter = pipelineJson.parameters.find((parameter) => parameter.name === parameterName);

        if (!parameter) {
            throw new UnexpectedError(`Could not find {${parameterName}}`);
        }

        if (parameter.isInput) {
            return 'input';
        }

        const template = pipelineJson.promptTemplates.find(
            (template) => template.resultingParameterName === parameterName,
        );

        if (!template) {
            throw new Error(`Could not find template for {${parameterName}}`);
        }

        return normalizeTo_camelCase('template-' + titleToName(template.title));
    };

    const promptbookMermaid = spaceTrim(
        (block) => `

            %% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

            flowchart LR
              subgraph "${pipelineJson.title}"

                  direction TB

                  input((Input)):::input
                  ${block(
                      pipelineJson.promptTemplates
                          .flatMap(({ title, dependentParameterNames, resultingParameterName }) => [
                              `${parameterNameToTemplateName(resultingParameterName)}("${title}")`,
                              ...dependentParameterNames.map(
                                  (dependentParameterName) =>
                                      `${parameterNameToTemplateName(
                                          dependentParameterName,
                                      )}--"{${dependentParameterName}}"-->${parameterNameToTemplateName(
                                          resultingParameterName,
                                      )}`,
                              ),
                          ])
                          .join('\n'),
                  )}

                  ${block(
                      pipelineJson.parameters
                          .filter(({ isOutput }) => isOutput)
                          .map(({ name }) => `${parameterNameToTemplateName(name)}--"{${name}}"-->output`)
                          .join('\n'),
                  )}
                  output((Output)):::output

                  ${block(
                      pipelineJson.promptTemplates
                          .map((promptTemplate) => {
                              const link = linkPromptTemplate(promptTemplate);

                              if (link === null) {
                                  return '';
                              }

                              const { href, title } = link;

                              const templateName = parameterNameToTemplateName(promptTemplate.resultingParameterName);

                              return `click ${templateName} href "${href}" "${title}";`;
                          })
                          .filter((line) => line !== '')
                          .join('\n'),
                  )}

                  classDef input color: grey;
                  classDef output color: grey;

              end;

        `,
    );

    return promptbookMermaid;
}

/**
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
