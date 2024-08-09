import spaceTrim from 'spacetrim';
import type { PipelineJson } from '../types/PipelineJson/PipelineJson';
import type { PromptTemplateParameterJson } from '../types/PipelineJson/PromptTemplateParameterJson';
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
    const { title, pipelineUrl, promptbookVersion, description, parameters, promptTemplates } = pipelineJson;

    let pipelineString: string_markdown = `# ${title}`;

    if (description) {
        pipelineString += '\n\n';
        pipelineString += description;
    }

    // TODO:> const commands: Array<Command>
    const commands: Array<string> = [];

    if (pipelineUrl) {
        commands.push(`PIPELINE URL ${pipelineUrl}`);
    }

    commands.push(`PROMPTBOOK VERSION ${promptbookVersion}`);

    pipelineString = prettifyMarkdown(pipelineString);

    for (const parameter of parameters.filter(({ isInput }) => isInput)) {
        commands.push(`INPUT PARAMETER ${promptTemplateParameterJsonToString(parameter)}`);
    }

    for (const parameter of parameters.filter(({ isOutput }) => isOutput)) {
        commands.push(`OUTPUT PARAMETER ${promptTemplateParameterJsonToString(parameter)}`);
    }

    pipelineString += '\n\n';
    pipelineString += commands.map((command) => `- ${command}`).join('\n');

    for (const promptTemplate of promptTemplates) {
        const {
            /* Note: Not using:> name, */
            title,
            description,
            /* Note: dependentParameterNames, */
            jokerParameterNames: jokers,
            blockType,
            content,
            postprocessingFunctionNames: postprocessing,
            expectations,
            expectFormat,
            resultingParameterName,
        } = promptTemplate;

        pipelineString += '\n\n';
        pipelineString += `## ${title}`;

        if (description) {
            pipelineString += '\n\n';
            pipelineString += description;
        }

        // TODO:> const commands: Array<Command>
        const commands: Array<string> = [];
        let contentLanguage: 'markdown' | 'text' | 'javascript' | 'typescript' | 'python' | '' = 'text';

        if (blockType === 'PROMPT_TEMPLATE') {
            const { modelRequirements } = promptTemplate;
            const { modelName, modelVariant } = modelRequirements;

            commands.push(`EXECUTE PROMPT TEMPLATE`);

            if (modelVariant) {
                commands.push(`MODEL VARIANT ${capitalize(modelVariant)}`);
            }

            if (modelName) {
                commands.push(`MODEL NAME \`${modelName}\``);
            }
        } else if (blockType === 'SIMPLE_TEMPLATE') {
            commands.push(`SIMPLE TEMPLATE`);
            // Note: Nothing special here
        } else if (blockType === 'SCRIPT') {
            commands.push(`EXECUTE SCRIPT`);
            if (promptTemplate.contentLanguage) {
                contentLanguage = promptTemplate.contentLanguage;
            } else {
                contentLanguage = '';
            }
        } else if (blockType === 'PROMPT_DIALOG') {
            commands.push(`PROMPT DIALOG`);
            // Note: Nothing special here
        } // <- }else if([🩻]

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

        pipelineString += '\n\n';
        pipelineString += commands.map((command) => `- ${command}`).join('\n');

        pipelineString += '\n\n';
        pipelineString += '```' + contentLanguage;
        pipelineString += '\n';
        pipelineString += spaceTrim(content);
        //                   <- TODO: !!! Escape
        //                   <- TODO: [🧠] Some clear strategy how to spaceTrim the blocks
        pipelineString += '\n';
        pipelineString += '```';

        pipelineString += '\n\n';
        pipelineString += `\`-> {${resultingParameterName}}\``; // <- TODO: !!! If the parameter here has description, add it and use promptTemplateParameterJsonToString
    }

    return pipelineString as PipelineString;
}

/**
 * @private internal utility of `pipelineJsonToString`
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
 * TODO: !!!! Implement new features and commands into `promptTemplateParameterJsonToString`
 * TODO: [🧠] Is there a way to auto-detect missing features in pipelineJsonToString
 * TODO: [🏛] Maybe make some markdown builder
 * TODO: [🏛] Escape all
 * TODO: [🧠] Should be in generated .ptbk.md file GENERATOR_WARNING
 */
