import spaceTrim from 'spacetrim';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';

/**
 * Converts execution report from JSON to string format
 */
export function executionReportJsonToString(executionReportJson: ExecutionReportJson): ExecutionReportString {
    // TODO: !!!!! Better (filter out voids)
    let executionReportString = spaceTrim(
        (block) => `
            # ${executionReportJson.title || 'Execution report'}

            ${block(executionReportJson.description || '')}

            - PTBK URL \`${executionReportJson.ptbkUrl || ''}\`
            - PTBK VERSION \`${executionReportJson.ptbkUsedVersion}\` (requested \`${
            executionReportJson.ptbkRequestedVersion || ''
        }\`)

      `,
    );

    for (const promptExecution of executionReportJson.promptExecutions) {
        executionReportString +=
            '\n\n\n\n' +
            spaceTrim(
                (block) => `
                ## ${promptExecution.prompt.title}

                ### Prompt

                \`\`\`
                ${block(promptExecution.prompt.content)}
                \`\`\`

                ### Result

                \`\`\`
                ${block(promptExecution.result?.content || '')}
                \`\`\`

                ### Model requirements

                \`\`\`
                ${block(JSON.stringify(promptExecution.prompt.modelRequirements, null, 4))}
                \`\`\`

                ### Error

                \`\`\`
                ${block(promptExecution.error?.message || '')}
                \`\`\`

            `,
            );
    }

    executionReportString = prettifyMarkdown(executionReportString);
    return executionReportString as ExecutionReportString;
}
