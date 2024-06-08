import spaceTrim from 'spacetrim';
import type { PromptbookJson } from './../types/PromptbookJson/PromptbookJson';
import type { PromptTemplateParameterJson } from './../types/PromptbookJson/PromptTemplateParameterJson';
import type { PromptbookString } from './../types/PromptbookString';
import type { string_markdown } from './../types/typeAliases';
import { prettifyMarkdown } from './../utils/markdown/prettifyMarkdown';
import { capitalize } from './../utils/normalization/capitalize';

/**
 * Converts promptbook in JSON format to string format
 *
 * @param promptbookJson Promptbook in JSON format (.ptbk.json)
 * @returns Promptbook in string format (.ptbk.md)
 */
export function promptbookJsonToString(promptbookJson: PromptbookJson): PromptbookString {
    const { title, promptbookUrl, promptbookVersion, description, parameters, promptTemplates } = promptbookJson;

    let promptbookString: string_markdown = `# ${title}`;

    if (description) {
        promptbookString += '\n\n';
        promptbookString += description;
    }

    // TODO:> const commands: Array<Command>
    const commands: Array<string> = [];

    if (promptbookUrl) {
        commands.push(`PROMPTBOOK URL ${promptbookUrl}`);
    }

    commands.push(`PROMPTBOOK VERSION ${promptbookVersion}`);

    promptbookString = prettifyMarkdown(promptbookString);

    for (const parameter of parameters) {
        const { isInput, isOutput } = parameter;

        if (isInput) {
            commands.push(`INPUT PARAMETER ${promptTemplateParameterJsonToString(parameter)}`);
        } else if (isOutput) {
            commands.push(`OUTPUT PARAMETER ${promptTemplateParameterJsonToString(parameter)}`);
        }
    }

    promptbookString += '\n\n';
    promptbookString += commands.map((command) => `- ${command}`).join('\n');

    for (const promptTemplate of promptTemplates) {
        const {
            /* Note: Not using:> name, */
            title,
            description,
            /* Note: dependentParameterNames, */
            jokers,
            executionType,
            content,
            postprocessing,
            expectations,
            expectFormat,
            resultingParameterName,
        } = promptTemplate;

        promptbookString += '\n\n';
        promptbookString += `## ${title}`;

        if (description) {
            promptbookString += '\n\n';
            promptbookString += description;
        }

        // TODO:> const commands: Array<Command>
        const commands: Array<string> = [];
        let contentLanguage: 'markdown' | 'text' | 'javascript' | 'typescript' | 'python' | '' = 'text';

        if (executionType === 'PROMPT_TEMPLATE') {
            const { modelRequirements } = promptTemplate;
            const { modelName, modelVariant } = modelRequirements;

            commands.push(`EXECUTE PROMPT TEMPLATE`);

            if (modelVariant) {
                commands.push(`MODEL VARIANT ${capitalize(modelVariant)}`);
            }

            if (modelName) {
                commands.push(`MODEL NAME \`${modelName}\``);
            }
        } else if (executionType === 'SIMPLE_TEMPLATE') {
            commands.push(`SIMPLE TEMPLATE`);
            // Note: Nothing special here
        } else if (executionType === 'SCRIPT') {
            commands.push(`EXECUTE SCRIPT`);
            if (promptTemplate.contentLanguage) {
                contentLanguage = promptTemplate.contentLanguage;
            } else {
                contentLanguage = '';
            }
        } else if (executionType === 'PROMPT_DIALOG') {
            commands.push(`PROMPT DIALOG`);
            // Note: Nothing special here
        }

        if (jokers) {
            for (const joker of jokers) {
                commands.push(`JOKER {${joker}}`);
            }
        } /* not else */
        if (postprocessing) {
            for (const postprocessingFunctionName of postprocessing) {
                commands.push(`POSTPROCESSING \`${postprocessingFunctionName}\``);
            }
        } /* not else */
        if (expectations) {
            for (const [unit, { min, max }] of Object.entries(expectations)) {
                if (min === max) {
                    commands.push(`EXPECT EXACTLY ${min} ${capitalize(unit + (min! > 1 ? 's' : ''))}`);
                } else {
                    if (min !== undefined) {
                        commands.push(`EXPECT MIN ${min} ${capitalize(unit + (min! > 1 ? 's' : ''))}`);
                    } /* not else */
                    if (max !== undefined) {
                        commands.push(`EXPECT MAX ${max} ${capitalize(unit + (max! > 1 ? 's' : ''))}`);
                    }
                }
            }
        } /* not else */
        if (expectFormat) {
            if (expectFormat === 'JSON') {
                // TODO: @deprecated remove
                commands.push(`EXPECT JSON`);
            }
        } /* not else */

        promptbookString += '\n\n';
        promptbookString += commands.map((command) => `- ${command}`).join('\n');

        promptbookString += '\n\n';
        promptbookString += '```' + contentLanguage;
        promptbookString += '\n';
        promptbookString += spaceTrim(content);
        //                   <- TODO: !!! Escape
        //                   <- TODO: [🧠] Some clear strategy how to spaceTrim the blocks
        promptbookString += '\n';
        promptbookString += '```';

        promptbookString += '\n\n';
        promptbookString += `\`-> {${resultingParameterName}}\``; // <- TODO: !!! If the parameter here has description, add it and use promptTemplateParameterJsonToString
    }

    return promptbookString as PromptbookString;
}

/**
 * @private internal util of promptbookJsonToString
 */
function promptTemplateParameterJsonToString(promptTemplateParameterJson: PromptTemplateParameterJson): string {
    const { name, description } = promptTemplateParameterJson;

    let parameterString = `{${name}}`;

    if (description) {
        parameterString = `${parameterString} ${description}`;
    }
    return parameterString;
}

/**
 * TODO: Escape all
 */
