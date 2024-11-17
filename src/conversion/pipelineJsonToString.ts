import spaceTrim from 'spacetrim';
import type { ParameterJson } from '../types/PipelineJson/ParameterJson';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PipelineString } from '../types/PipelineString';
import type { string_markdown } from '../types/typeAliases';
import { prettifyMarkdown } from '../utils/markdown/prettifyMarkdown';
import { capitalize } from '../utils/normalization/capitalize';

/**
 * Converts promptbook in JSON format to string format
 *
 * @param pipelineJson Promptbook in JSON format (.ptbk.json)
 * @returns Promptbook in string format (.ptbk.md)
 * @public exported from `@promptbook/core`
 */
export function pipelineJsonToString(pipelineJson: PipelineJson): PipelineString {
    const { title, pipelineUrl, bookVersion, description, parameters, templates } = pipelineJson;

    let pipelineString: string_markdown = `# ${title}`;

    if (description) {
        pipelineString += '\n\n';
        pipelineString += description;
    }

    const commands: Array<string> = [];

    if (pipelineUrl) {
        commands.push(`PIPELINE URL ${pipelineUrl}`);
    }

    if (bookVersion !== `undefined`) {
        commands.push(`PROMPTBOOK VERSION ${bookVersion}`);
    }

    // TODO: [main] !!!!!! This increase size of the bundle and is probbably not necessary
    pipelineString = prettifyMarkdown(pipelineString);

    for (const parameter of parameters.filter(({ isInput }) => isInput)) {
        commands.push(`INPUT PARAMETER ${templateParameterJsonToString(parameter)}`);
    }

    for (const parameter of parameters.filter(({ isOutput }) => isOutput)) {
        commands.push(`OUTPUT PARAMETER ${templateParameterJsonToString(parameter)}`);
    }

    pipelineString += '\n\n';
    pipelineString += commands.map((command) => `- ${command}`).join('\n');

    for (const template of templates) {
        const {
            /* Note: Not using:> name, */
            title,
            description,
            /* Note: dependentParameterNames, */
            jokerParameterNames: jokers,
            templateType,
            content,
            postprocessingFunctionNames: postprocessing,
            expectations,
            format,
            resultingParameterName,
        } = template;

        pipelineString += '\n\n';
        pipelineString += `## ${title}`;

        if (description) {
            pipelineString += '\n\n';
            pipelineString += description;
        }

        const commands: Array<string> = [];
        let contentLanguage: 'markdown' | 'text' | 'javascript' | 'typescript' | 'python' | '' = 'text';

        if (templateType === 'PROMPT_TEMPLATE') {
            const { modelRequirements } = template;
            const { modelName, modelVariant } = modelRequirements || {};

            commands.push(`EXECUTE PROMPT TEMPLATE`);

            if (modelVariant) {
                commands.push(`MODEL VARIANT ${capitalize(modelVariant)}`);
            }

            if (modelName) {
                commands.push(`MODEL NAME \`${modelName}\``);
            }
        } else if (templateType === 'SIMPLE_TEMPLATE') {
            commands.push(`SIMPLE TEMPLATE`);
            // Note: Nothing special here
        } else if (templateType === 'SCRIPT_TEMPLATE') {
            commands.push(`SCRIPT TEMPLATE`);
            if (template.contentLanguage) {
                contentLanguage = template.contentLanguage;
            } else {
                contentLanguage = '';
            }
        } else if (templateType === 'DIALOG_TEMPLATE') {
            commands.push(`DIALOG TEMPLATE`);
            // Note: Nothing special here
        } // <- }else if([🅱]

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
        if (format) {
            if (format === 'JSON') {
                // TODO: @deprecated remove
                commands.push(`FORMAT JSON`);
            }
        } /* not else */

        pipelineString += '\n\n';
        pipelineString += commands.map((command) => `- ${command}`).join('\n');

        pipelineString += '\n\n';
        pipelineString += '```' + contentLanguage;
        pipelineString += '\n';
        pipelineString += spaceTrim(content);
        //                   <- TODO: [main] !!! Escape
        //                   <- TODO: [🧠] Some clear strategy how to spaceTrim the blocks
        pipelineString += '\n';
        pipelineString += '```';

        pipelineString += '\n\n';
        pipelineString += `\`-> {${resultingParameterName}}\``; // <- TODO: [main] !!! If the parameter here has description, add it and use templateParameterJsonToString
    }

    return pipelineString as PipelineString;
}

/**
 * @private internal utility of `pipelineJsonToString`
 */
function templateParameterJsonToString(templateParameterJson: ParameterJson): string {
    const { name, description } = templateParameterJson;

    let parameterString = `{${name}}`;

    if (description) {
        parameterString = `${parameterString} ${description}`;
    }
    return parameterString;
}

/**
 * TODO: [🛋] Implement new features and commands into `pipelineJsonToString` + `templateParameterJsonToString` , use `stringifyCommand`
 * TODO: [🧠] Is there a way to auto-detect missing features in pipelineJsonToString
 * TODO: [🏛] Maybe make some markdown builder
 * TODO: [🏛] Escape all
 * TODO: [🧠] Should be in generated .ptbk.md file GENERATOR_WARNING
 */
