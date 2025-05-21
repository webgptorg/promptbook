import { spaceTrim } from 'spacetrim';
import { RESERVED_PARAMETER_NAMES } from '../../constants';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_href } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { titleToName } from '../../utils/normalization/titleToName';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Additional options for rendering Mermaid graph
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

    const MERMAID_PREFIX = 'pipeline_';
    const MERMAID_KNOWLEDGE_NAME = MERMAID_PREFIX + 'knowledge';
    const MERMAID_RESERVED_NAME = MERMAID_PREFIX + 'reserved';
    const MERMAID_INPUT_NAME = MERMAID_PREFIX + 'input';
    const MERMAID_OUTPUT_NAME = MERMAID_PREFIX + 'output';

    const parameterNameToTaskName = (parameterName: string_name) => {
        if (parameterName === 'knowledge') {
            return MERMAID_KNOWLEDGE_NAME;
        } else if (RESERVED_PARAMETER_NAMES.includes(parameterName as TODO_any)) {
            return MERMAID_RESERVED_NAME;
        }

        const parameter = pipelineJson.parameters.find((parameter) => parameter.name === parameterName);

        if (!parameter) {
            throw new UnexpectedError(`Could not find {${parameterName}}`);
            // <- TODO: This causes problems when {knowledge} and other reserved parameters are used
        }

        if (parameter.isInput) {
            return MERMAID_INPUT_NAME;
        }

        const task = pipelineJson.tasks.find((task) => task.resultingParameterName === parameterName);

        if (!task) {
            throw new Error(`Could not find task for {${parameterName}}`);
        }

        return MERMAID_PREFIX + (task.name || normalizeTo_camelCase('task-' + titleToName(task.title)));
    };

    const inputAndIntermediateParametersMermaid = pipelineJson.tasks
        .flatMap(({ title, dependentParameterNames, resultingParameterName }) => [
            `${parameterNameToTaskName(resultingParameterName)}("${title}")`,
            ...dependentParameterNames.map(
                (dependentParameterName) =>
                    `${parameterNameToTaskName(
                        dependentParameterName,
                    )}--"{${dependentParameterName}}"-->${parameterNameToTaskName(resultingParameterName)}`,
            ),
        ])
        .join('\n');

    const outputParametersMermaid = pipelineJson.parameters
        .filter(({ isOutput }) => isOutput)
        .map(({ name }) => `${parameterNameToTaskName(name)}--"{${name}}"-->${MERMAID_OUTPUT_NAME}`)
        .join('\n');

    const linksMermaid = pipelineJson.tasks
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
        .join('\n');

    const interactionPointsMermaid = Object.entries({
        [MERMAID_INPUT_NAME]: 'Input',
        [MERMAID_OUTPUT_NAME]: 'Output',
        [MERMAID_RESERVED_NAME]: 'Other',
        [MERMAID_KNOWLEDGE_NAME]: 'Knowledge',
    })
        .filter(([MERMAID_NAME]) =>
            (inputAndIntermediateParametersMermaid + outputParametersMermaid).includes(MERMAID_NAME),
        )
        .map(([MERMAID_NAME, title]) => `${MERMAID_NAME}((${title})):::${MERMAID_NAME}`)
        .join('\n');

    const promptbookMermaid = spaceTrim(
        (block) => `

            %% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

            flowchart LR
              subgraph "${pipelineJson.title}"

                  %% Basic configuration
                  direction TB

                  %% Interaction points from pipeline to outside
                  ${block(interactionPointsMermaid)}

                  %% Input and intermediate parameters
                  ${block(inputAndIntermediateParametersMermaid)}


                  %% Output parameters
                  ${block(outputParametersMermaid)}

                  %% Links
                  ${block(linksMermaid)}

                  %% Styles
                  classDef ${MERMAID_INPUT_NAME} color: grey;
                  classDef ${MERMAID_OUTPUT_NAME} color: grey;
                  classDef ${MERMAID_RESERVED_NAME} color: grey;
                  classDef ${MERMAID_KNOWLEDGE_NAME} color: grey;

              end;

        `,
    );

    return promptbookMermaid;
}

/**
 * TODO: [🧠] FOREACH in mermaid graph
 * TODO: [🧠] Knowledge in mermaid graph
 * TODO: [🧠] Personas in mermaid graph
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */
