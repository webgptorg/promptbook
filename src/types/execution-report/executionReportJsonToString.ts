import spaceTrim from 'spacetrim';
import { escapeMarkdownBlock } from '../../utils/markdown/escapeMarkdownBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';

/**
 * Converts execution report from JSON to string format
 */
export function executionReportJsonToString(executionReportJson: ExecutionReportJson): ExecutionReportString {
    // TODO: [🎡] Add timing information to report
    // TODO: [🎡] Add cost information to report
    // TODO: [🎡] Better (filter out voids)
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

                -   MODEL VARIANT ${promptExecution.prompt.modelRequirements.modelVariant}
                -   MODEL NAME \`${promptExecution.result?.model}\` (requested \`${
                    promptExecution.prompt.modelRequirements.modelName
                }\`)

                ### Prompt

                \`\`\`
                ${block(escapeMarkdownBlock(promptExecution.prompt.content))}
                \`\`\`

                `,
            );

        if (promptExecution.result) {
            executionReportString +=
                '\n\n\n\n' +
                spaceTrim(
                    (block) => `

                        ### Result

                        \`\`\`
                        ${block(escapeMarkdownBlock(promptExecution.result!.content || ''))}
                        \`\`\`
                    `,
                );
        }

        if (promptExecution.error) {
            executionReportString +=
                '\n\n\n\n' +
                spaceTrim(
                    (block) => `

                        ### Error

                        \`\`\`
                        ${block(escapeMarkdownBlock(promptExecution.error!.message || ''))}
                        \`\`\`

                    `,
                );
        }
    }

    executionReportString = prettifyMarkdown(executionReportString);
    return executionReportString as ExecutionReportString;
}
