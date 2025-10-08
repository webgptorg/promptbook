import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import type { ReadonlyDeep } from 'type-fest';
import { MOMENT_ARG_THRESHOLDS } from '../../config';
import type { number_usd } from '../../types/typeAliases';
import { createMarkdownChart } from '../../utils/markdown/createMarkdownChart';
import { escapeMarkdownBlock } from '../../utils/markdown/escapeMarkdownBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import type { FromtoItems } from '../../utils/misc/FromtoItems';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { just } from '../../utils/organization/just';
import { numberToString } from '../../utils/parameters/numberToString';
import { embeddingVectorToString } from '../embeddingVectorToString';
import type { ExecutionReportJson } from './ExecutionReportJson';
import type { ExecutionReportString } from './ExecutionReportString';
import type { ExecutionReportStringOptions } from './ExecutionReportStringOptions';
import { ExecutionReportStringOptionsDefaults } from './ExecutionReportStringOptions';
import { countWorkingDuration } from './countWorkingDuration';

/**
 * Converts execution report from JSON to string format
 *
 * @public exported from `@promptbook/core`
 */
export function executionReportJsonToString(
    executionReportJson: ReadonlyDeep<ExecutionReportJson>,
    options?: Partial<ExecutionReportStringOptions>,
): ExecutionReportString {
    const { taxRate, chartsWidth } = { ...ExecutionReportStringOptionsDefaults, ...(options || {}) };

    let executionReportString = spaceTrim(
        (block) => `
            # ${executionReportJson.title || 'Execution report'}

            ${block(executionReportJson.description || '')}
          `,
    );

    const headerList: Array<string> = [];

    if (executionReportJson.pipelineUrl) {
        headerList.push(`PIPELINE URL ${executionReportJson.pipelineUrl}`);
    }

    headerList.push(
        `PROMPTBOOK VERSION ${executionReportJson.promptbookUsedVersion}` +
            (!executionReportJson.promptbookRequestedVersion
                ? ''
                : ` *(requested ${executionReportJson.promptbookRequestedVersion})*`),
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
            from: moment(promptExecution.result?.timing?.start).valueOf() / 1000,
            to: moment(promptExecution.result?.timing?.complete).valueOf() / 1000,
        }));

        const costItems: FromtoItems = executionReportJson.promptExecutions
            .filter((promptExecution) => typeof promptExecution.result?.usage?.price === 'number')
            .map((promptExecution) => ({
                title: promptExecution.prompt.title,
                from: 0,
                to:
                    (promptExecution.result?.usage?.price.value || 0) /* <- TODO: look at uncertain numbers */ *
                    (1 + taxRate),
            }));

        const duration = moment.duration(completedAt.diff(startedAt));
        const llmDuration = moment.duration(countWorkingDuration(timingItems) * 1000);

        const executionsWithKnownCost = executionReportJson.promptExecutions.filter(
            (promptExecution) => (promptExecution.result?.usage?.price || 'UNKNOWN') !== 'UNKNOWN',
        );
        const cost: number_usd = executionsWithKnownCost.reduce(
            (cost, promptExecution) =>
                cost + (promptExecution.result!.usage.price.value /* <- Look at uncertain number */ || 0),
            0,
        );

        headerList.push(`STARTED AT ${moment(startedAt).format(`YYYY-MM-DD HH:mm:ss`)}`);
        headerList.push(`COMPLETED AT ${moment(completedAt).format(`YYYY-MM-DD HH:mm:ss`)}`);
        headerList.push(`TOTAL DURATION ${duration.humanize(MOMENT_ARG_THRESHOLDS)}`);
        headerList.push(`TOTAL LLM DURATION ${llmDuration.humanize(MOMENT_ARG_THRESHOLDS)}`);

        headerList.push(
            `TOTAL COST $${numberToString(cost * (1 + taxRate))}` +
                (executionsWithKnownCost.length === executionReportJson.promptExecutions.length
                    ? ''
                    : ` *(Some cost is unknown)*`) +
                (taxRate !== 0 ? ` *(with tax ${taxRate * 100}%)*` : ''),
        );

        executionReportString += '\n\n' + headerList.map((header) => `- ${header}`).join('\n');

        executionReportString +=
            '\n\n' +
            '## 🗃 Index' +
            '\n\n' +
            executionReportJson.promptExecutions
                .map((promptExecution) => {
                    // TODO: [💩] Make some better system to convert headings to links
                    let hash = normalizeToKebabCase(promptExecution.prompt.title);
                    if (/^\s*\p{Extended_Pictographic}/u.test(promptExecution.prompt.title)) {
                        hash = '-' + hash;
                    }

                    // TODO: Make working hash link for the task in md + pdf

                    return `- [${promptExecution.prompt.title}](#${hash})`;
                })
                .join('\n');

        executionReportString +=
            '\n\n' +
            '## ⌚ Time chart' +
            '\n\n' +
            createMarkdownChart({
                nameHeader: 'Task',
                valueHeader: 'Timeline',
                items: timingItems,
                width: chartsWidth,
                unitName: 'seconds',
            });

        executionReportString +=
            '\n\n' +
            '## 💸 Cost chart' +
            '\n\n' +
            createMarkdownChart({
                nameHeader: 'Task',
                valueHeader: 'Cost',
                items: costItems,
                width: chartsWidth,
                unitName: 'USD',
            });
    } else {
        headerList.push(`TOTAL COST $0 *(Nothing executed)*`);
    }

    for (const promptExecution of executionReportJson.promptExecutions) {
        executionReportString += '\n\n\n\n' + `## ${promptExecution.prompt.title}`;

        const taskList: Array<string> = [];

        // TODO: What if startedAt OR/AND completedAt is not defined?
        const startedAt = moment(promptExecution.result?.timing?.start);
        const completedAt = moment(promptExecution.result?.timing?.complete);
        const duration = moment.duration(completedAt.diff(startedAt));

        // Not need here:
        // > taskList.push(`STARTED AT ${moment(startedAt).calendar()}`);
        taskList.push(`DURATION ${duration.humanize(MOMENT_ARG_THRESHOLDS)}`);

        if (typeof promptExecution.result?.usage?.price === 'number') {
            taskList.push(
                `COST $${numberToString(promptExecution.result.usage.price * (1 + taxRate))}` +
                    (taxRate !== 0 ? ` *(with tax ${taxRate * 100}%)*` : ''),
            );
        } else {
            taskList.push(`COST UNKNOWN`);
        }

        executionReportString += '\n\n' + taskList.map((header) => `- ${header}`).join('\n');

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
                        ${block(
                            escapeMarkdownBlock(
                                promptExecution.result?.rawPromptContent || promptExecution.prompt.content,
                            ),
                        )}
                        \`\`\`

                    `,
                );
        }

        if (promptExecution.result && promptExecution.result.content) {
            executionReportString += '\n\n\n\n' + '### Result' + '\n\n';

            if (promptExecution.result === undefined) {
                executionReportString += '*No result*';
            } else if (typeof promptExecution.result.content === 'string') {
                executionReportString += spaceTrim(
                    (block) => `
                          \`\`\`
                          ${block(escapeMarkdownBlock(promptExecution.result!.content as string))}
                          \`\`\`
                      `,
                );
            } else {
                executionReportString += embeddingVectorToString(promptExecution.result.content);
            }
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
 * TODO: Add mermaid chart for every report
 * TODO: [🧠] Allow to filter out some parts of the report by options
 * TODO: [🧠] Should be in generated file GENERATOR_WARNING
 */
