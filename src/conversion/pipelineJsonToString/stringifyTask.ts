import { spaceTrim } from 'spacetrim';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { string_markdown } from '../../types/string_markdown';
import { createTaskSerialization } from './createTaskSerialization';
import { stringifyCommands } from './stringifyCommands';

/**
 * Stringifies one task section of the pipeline.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function stringifyTask(task: TaskJson): string_markdown {
    const { title, description, content, resultingParameterName } = task;
    const { commands, contentLanguage } = createTaskSerialization(task);

    return spaceTrim(
        (block) => `
            ## ${title}

            ${block(description || '')}

            ${block(stringifyCommands(commands))}

            \`\`\`${contentLanguage}
            ${block(spaceTrim(content))}
            \`\`\`

            \`-> {${resultingParameterName}}\`
        `,
    ); // <- TODO: [main] !!3 If the parameter here has description, add it and use taskParameterJsonToString
    // <- TODO: [main] !!3 Escape
    // <- TODO: [🧠] Some clear strategy how to spaceTrim the blocks
}
