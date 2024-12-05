import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_href } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { titleToName } from '../utils/titleToName';

/**
 * Addtional options for rendering Mermaid graph
 */
export type renderPipelineMermaidOptions = {
    /**
     * Callback for creating from task graph node
     */
    linkTask?(task: TaskJson): { href: string_href; title: string } | null;
};

/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 *
 * @public exported from `@promptbook/utils`
 */
export function renderPromptbookMermaid(pipelineJson: PipelineJson, options?: renderPipelineMermaidOptions): string {
    const { linkTask = () => null } = options || {};

    const parameterNameToTaskName = (parameterName: string_name) => {
        const parameter = pipelineJson.parameters.find((parameter) => parameter.name === parameterName);

        if (!parameter) {
            throw new UnexpectedError(`Could not find {${parameterName}}`);
            // <- TODO: !!!!!! This causes problems when {knowledge} and other reserved parameters are used
        }

        if (parameter.isInput) {
            return 'input';
        }

        const task = pipelineJson.tasks.find((task) => task.resultingParameterName === parameterName);

        if (!task) {
            throw new Error(`Could not find task for {${parameterName}}`);
        }

        return normalizeTo_camelCase('task-' + titleToName(task.title));
    };

    const promptbookMermaid = spaceTrim(
        (block) => `

            %% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

            flowchart LR
              subgraph "${pipelineJson.title}"

                  direction TB

                  input((Input)):::input
                  ${block(
                      pipelineJson.tasks
                          .flatMap(({ title, dependentParameterNames, resultingParameterName }) => [
                              `${parameterNameToTaskName(resultingParameterName)}("${title}")`,
                              ...dependentParameterNames.map(
                                  (dependentParameterName) =>
                                      `${parameterNameToTaskName(
                                          dependentParameterName,
                                      )}--"{${dependentParameterName}}"-->${parameterNameToTaskName(
                                          resultingParameterName,
                                      )}`,
                              ),
                          ])
                          .join('\n'),
                  )}

                  ${block(
                      pipelineJson.parameters
                          .filter(({ isOutput }) => isOutput)
                          .map(({ name }) => `${parameterNameToTaskName(name)}--"{${name}}"-->output`)
                          .join('\n'),
                  )}
                  output((Output)):::output

                  ${block(
                      pipelineJson.tasks
                          .map((task) => {
                              const link = linkTask(task);

                              if (link === null) {
                                  return '';
                              }

                              const { href, title } = link;

                              const taskName = parameterNameToTaskName(task.resultingParameterName);

                              return `click ${taskName} href "${href}" "${title}";`;
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
