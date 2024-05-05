import { spaceTrim } from 'spacetrim';
import { PromptbookJson } from '../../_packages/types.index';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { string_name } from '../../types/typeAliases';
import { titleToName } from '../utils/titleToName';

/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 */
export function renderPromptbookMermaid(promptbookJson: PromptbookJson): string {
    const parameterNameToTemplateName = (parameterName: string_name) => {
        const parameter = promptbookJson.parameters.find((parameter) => parameter.name === parameterName);

        if (!parameter) {
            throw new UnexpectedError(`Could not find {${parameterName}}`);
        }

        if (parameter.isInput) {
            return 'input';
        }

        const template = promptbookJson.promptTemplates.find(
            (template) => template.resultingParameterName === parameterName,
        );

        if (!template) {
            throw new Error(`Could not find template for {${parameterName}}`);
        }

        return 'template-' + titleToName(template.title);
    };

    const promptbookMermaid = spaceTrim(
        (block) => `

            %% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

            flowchart LR
              subgraph "${promptbookJson.title}"

                  direction TB

                  input((Input)):::input
                  ${block(
                      promptbookJson.promptTemplates
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
                      promptbookJson.parameters
                          .filter(({ isOutput }) => isOutput)
                          .map(({ name }) => `${parameterNameToTemplateName(name)}--"{${name}}"-->output`)
                          .join('\n'),
                  )}
                  output((Output)):::output

                  classDef input color: grey;
                  classDef output color: grey;

              end;

        `,
    );

    // TODO: !!!!! Allow to put link callback into `renderPromptbookMermaid`

    return promptbookMermaid;
}

/**
 * TODO: Maybe use some Mermaid library instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
