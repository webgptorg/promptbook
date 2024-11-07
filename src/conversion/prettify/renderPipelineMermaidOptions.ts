import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { TemplateJson } from '../../types/PipelineJson/TemplateJson';
import type { string_href, string_name } from '../../types/typeAliases';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { titleToName } from '../utils/titleToName';

/**
 * Addtional options for rendering Mermaid graph
 */
export type renderPipelineMermaidOptions = {
    /**
     * Callback for creating from template graph node
     */
    linkTemplate?(template: TemplateJson): { href: string_href; title: string } | null;
};

/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 *
 * @public exported from `@promptbook/utils`
 */
export function renderPromptbookMermaid(pipelineJson: PipelineJson, options?: renderPipelineMermaidOptions): string {
    const { linkTemplate = () => null } = options || {};

    const parameterNameToTemplateName = (parameterName: string_name) => {
        const parameter = pipelineJson.parameters.find((parameter) => parameter.name === parameterName);

        if (!parameter) {
            throw new UnexpectedError(`Could not find {${parameterName}}`);
        }

        if (parameter.isInput) {
            return 'input';
        }

        const template = pipelineJson.templates.find((template) => template.resultingParameterName === parameterName);

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
                      pipelineJson.templates
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
                      pipelineJson.templates
                          .map((template) => {
                              const link = linkTemplate(template);

                              if (link === null) {
                                  return '';
                              }

                              const { href, title } = link;

                              const templateName = parameterNameToTemplateName(template.resultingParameterName);

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
 * TODO: [🧠] !! FOREACH in mermaid graph
 * TODO: [🧠] !! Knowledge in mermaid graph
 * TODO: [🧠] !! Personas in mermaid graph
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
