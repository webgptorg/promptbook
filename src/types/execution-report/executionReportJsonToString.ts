import moment from 'moment';
import spaceTrim from 'spacetrim';
import { escapeMarkdownBlock } from '../../utils/markdown/escapeMarkdownBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import { number_usd } from '../typeAliases';
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
          `,
    );

    const headerList: Array<string> = [];

    if (executionReportJson.ptbkUrl) {
        headerList.push(`PTBK URL ${executionReportJson.ptbkUrl}`);
    }

    headerList.push(
        `PTBK VERSION ${executionReportJson.ptbkUsedVersion}` +
            (!executionReportJson.ptbkRequestedVersion
                ? ''
                : ` *(requested ${executionReportJson.ptbkRequestedVersion})*`),
    );

    if (executionReportJson.promptExecutions.length !== 0) {
        const startedAt = moment(
            Math.min(
                ...executionReportJson.promptExecutions
                    .filter((promptExecution) => promptExecution.result?.timing?.start)
                    .map((promptExecution) => moment(promptExecution.result!.timing.start).valueOf()),
            ),
        );
        const completedAt = moment(
            Math.max(
                ...executionReportJson.promptExecutions
                    .filter((promptExecution) => promptExecution.result?.timing?.complete)
                    .map((promptExecution) => moment(promptExecution.result!.timing.complete).valueOf()),
            ),
        );
        const duration = moment.duration(completedAt.diff(startedAt));

        const executionsWithKnownCost = executionReportJson.promptExecutions.filter(
            (promptExecution) => (promptExecution.result?.usage?.price || 'UNKNOWN') !== 'UNKNOWN',
        );
        const cost: number_usd = executionsWithKnownCost.reduce(
            (cost, promptExecution) => cost + ((promptExecution.result!.usage.price! as number) || 0),
            0,
        );

        headerList.push(`STARTED AT ${moment(startedAt).calendar()}`);
        headerList.push(`TOTAL DURATION ${duration.humanize()}`);
        headerList.push(
            `TOTAL COST $${cost}` +
                (executionsWithKnownCost.length === executionReportJson.promptExecutions.length
                    ? ''
                    : ` *(Some cost is unknown)*`),
        );
    } else {
        headerList.push(`TOTAL COST $0 *(Nothing executed)*`);
    }

    executionReportString += '\n\n' + headerList.map((header) => `- ${header}`).join('\n');

    // TODO: !!!! The table here

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

    // executionReportString = removeVoids(executionReportString); // <- TODO: !!!!!!! Maybe no need
    executionReportString = prettifyMarkdown(executionReportString);
    return executionReportString as ExecutionReportString;
}
