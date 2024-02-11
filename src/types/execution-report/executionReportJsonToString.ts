import moment from 'moment';
import spaceTrim from 'spacetrim';
import { FromtoItems } from '../../utils/FromtoItems';
import { just } from '../../utils/just';
import { createMarkdownChart } from '../../utils/markdown/createMarkdownChart.test';
import { escapeMarkdownBlock } from '../../utils/markdown/escapeMarkdownBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import { number_usd } from '../typeAliases';
import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';
import type { ExecutionReportStringOptions } from './ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from './ExecutionReportStringOptions';
import { MOMENT_ARG_THRESHOLDS } from './config';
import { countWorkingDuration } from './countWorkingDuration.test';

/**
 * Converts execution report from JSON to string format
 */
export function executionReportJsonToString(
    executionReportJson: ExecutionReportJson,
    options?: Partial<ExecutionReportStringOptions>,
): ExecutionReportString {
    const { taxRate } = { ...ExecutionReportStringOptionsDefaults, ...(options || {}) };

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
        // TODO: What if startedAt OR/AND completedAt is not defined?
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

        const timingItems: FromtoItems = executionReportJson.promptExecutions.map((promptExecution) => ({
            title: promptExecution.prompt.title,
            from: moment(promptExecution.result?.timing?.start).valueOf(),
            to: moment(promptExecution.result?.timing?.complete).valueOf(),
        }));

        const costItems: FromtoItems = executionReportJson.promptExecutions
            .filter((promptExecution) => typeof promptExecution.result?.usage?.price === 'number')
            .map((promptExecution) => ({
                title: promptExecution.prompt.title,
                from: 0,
                to: (promptExecution.result?.usage?.price as number) * (1 + taxRate),
            }));

        const duration = moment.duration(completedAt.diff(startedAt));
        const naturalDuration = moment.duration(countWorkingDuration(timingItems));

        const executionsWithKnownCost = executionReportJson.promptExecutions.filter(
            (promptExecution) => (promptExecution.result?.usage?.price || 'UNKNOWN') !== 'UNKNOWN',
        );
        const cost: number_usd =
            executionsWithKnownCost.reduce(
                (cost, promptExecution) => cost + ((promptExecution.result!.usage.price! as number) || 0),
                0,
            ) *
            (1 + taxRate);

        headerList.push(`STARTED AT ${moment(startedAt).format(`YYYY-MM-DD HH:mm:ss`)}`);
        headerList.push(`COMPLETED AT ${moment(completedAt).format(`YYYY-MM-DD HH:mm:ss`)}`);
        headerList.push(`TOTAL DURATION ${duration.humanize(MOMENT_ARG_THRESHOLDS)}`);
        headerList.push(`TOTAL NATURAL DURATION ${naturalDuration.humanize(MOMENT_ARG_THRESHOLDS)}`);

        headerList.push(
            `TOTAL COST $${cost}` +
                (executionsWithKnownCost.length === executionReportJson.promptExecutions.length
                    ? ''
                    : ` *(Some cost is unknown)*`) +
                (taxRate !== 0 ? ` *(with tax ${taxRate * 100} %)*` : ''),
        );

        executionReportString += '\n\n' + headerList.map((header) => `- ${header}`).join('\n');

        executionReportString +=
            '\n\n' +
            '## 🗃 Prompt templates' +
            '\n\n' +
            executionReportJson.promptExecutions
                .map(
                    (promptExecution) =>
                        `- [${promptExecution.prompt.title}](#${
                            promptExecution.prompt.title /* <- TODO: !!! Make link work in md + pdf */
                        })`,
                )
                .join('\n');

        executionReportString += '\n\n' + '## ⌚ Time chart' + '\n\n' + createMarkdownChart(timingItems);

        // !!! Remove
        // TODO: [🧠] Add the timing table or visialization:
        // Template 1 | 🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛⬛⬛
        // Template 2 | ⬛⬛⬛⬛🟦🟦⬛⬛⬛⬛⬛⬛
        // Template 3 | ⬛⬛⬛🟦🟦🟦🟦🟦⬛⬛⬛⬛
        // Template 4 | ⬛⬛⬛⬛⬛⬛🟦🟦🟦🟦🟦⬛
        // Template 5 | ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛🟦

        executionReportString += '\n\n' + '## 💸 Cost chart' + '\n\n' + createMarkdownChart(costItems);

        // !!! Remove
        // TODO: [🧠] Add the cost table or visialization:
        // GPT-3      | 🟦🟦🟦⬛⬛⬛⬛⬛⬛⬛⬛⬛
        // GPT-4      | 🟦🟦🟦🟦🟦🟦🟦🟦🟦⬛⬛⬛
    } else {
        headerList.push(`TOTAL COST $0 *(Nothing executed)*`);
    }

    for (const promptExecution of executionReportJson.promptExecutions) {
        executionReportString += '\n\n\n\n' + `## ${promptExecution.prompt.title}`;

        const templateList: Array<string> = [];

        // TODO: What if startedAt OR/AND completedAt is not defined?
        const startedAt = moment(promptExecution.result?.timing?.start);
        const completedAt = moment(promptExecution.result?.timing?.complete);
        const duration = moment.duration(completedAt.diff(startedAt));

        // Not need here:
        // > templateList.push(`STARTED AT ${moment(startedAt).calendar()}`);
        templateList.push(`DURATION ${duration.humanize(MOMENT_ARG_THRESHOLDS)}`);

        if (typeof promptExecution.result?.usage?.price === 'number') {
            templateList.push(
                `COST $${promptExecution.result.usage.price * (1 + taxRate)}` +
                    (taxRate !== 0 ? ` *(with tax ${taxRate * 100} %)*` : ''),
            );
        } else {
            templateList.push(`COST UNKNOWN`);
        }

        executionReportString += '\n\n' + templateList.map((header) => `- ${header}`).join('\n');

        /*
          -   MODEL VARIANT ${promptExecution.prompt.modelRequirements.modelVariant}
                -   MODEL NAME \`${promptExecution.result?.model}\` (requested \`${
                    promptExecution.prompt.modelRequirements.modelName
        
        */

        if (just(true)) {
            executionReportString +=
                '\n\n\n\n' +
                spaceTrim(
                    (block) => `

                        ### Prompt

                        \`\`\`
                        ${block(escapeMarkdownBlock(promptExecution.prompt.content))}
                        \`\`\`

                    `,
                );
        }

        if (promptExecution.result && promptExecution.result.content) {
            executionReportString +=
                '\n\n\n\n' +
                spaceTrim(
                    (block) => `

                        ### Result

                        \`\`\`
                        ${block(escapeMarkdownBlock(promptExecution.result!.content))}
                        \`\`\`
                    `,
                );
        }

        if (promptExecution.error && promptExecution.error.message) {
            executionReportString +=
                '\n\n\n\n' +
                spaceTrim(
                    (block) => `

                        ### Error

                        \`\`\`
                        ${block(escapeMarkdownBlock(promptExecution.error!.message))}
                        \`\`\`

                    `,
                );
        }
    }

    executionReportString = prettifyMarkdown(executionReportString);
    return executionReportString as ExecutionReportString;
}

/**
 * TODO: [🧠] Allow to filter out some parts of the report by options
 */
