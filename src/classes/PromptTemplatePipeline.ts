import { string_name } from '.././types/typeAliases';
import { promptTemplatePipelineStringToJson } from '../conversion/promptTemplatePipelineStringToJson';
import { validatePromptTemplatePipelineJson } from '../conversion/validatePromptTemplatePipelineJson';
import { PromptTemplateJson } from '../types/PromptTemplatePipelineJson/PromptTemplateJson';
import { PromptTemplateParameterJson } from '../types/PromptTemplatePipelineJson/PromptTemplateParameterJson';
import { PromptTemplatePipelineJson } from '../types/PromptTemplatePipelineJson/PromptTemplatePipelineJson';
import { PromptTemplatePipelineString } from '../types/PromptTemplatePipelineString';

/**
 * Prompt template pipeline is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * It can have 3 formats:
 * -   **.ptbk.md file** in custom markdown format described above
 * -   **JSON** format, parsed from the .ptbk.md file
 * -   _(this)_ **Object** which is created from JSON format and bound with tools around (but not the execution logic)
 *
 * @see https://github.com/webgptorg/promptbook#prompt-template-pipeline
 */
export class PromptTemplatePipeline {
    /**
     * Constructs PromptTemplatePipeline from any source
     *
     * Note: During the construction syntax and logic of source is validated
     *
     * @param source content of .ptbk.md or .ptbk.json file
     * @returns PromptTemplatePipeline
     */
    public static fromSource(
        ptbkSource: PromptTemplatePipelineString | PromptTemplatePipelineJson,
    ): PromptTemplatePipeline {
        if (typeof ptbkSource === 'string') {
            return PromptTemplatePipeline.fromString(ptbkSource);
        } else {
            return PromptTemplatePipeline.fromJson(ptbkSource);
        }
    }

    /**
     * Constructs PromptTemplatePipeline from markdown source
     *
     * Note: During the construction syntax and logic of source is validated
     *
     * @param ptbkString content of .ptbk.md file
     * @returns PromptTemplatePipeline
     */
    public static fromString(ptbkString: PromptTemplatePipelineString): PromptTemplatePipeline {
        const ptbkjson = promptTemplatePipelineStringToJson(ptbkString);
        return PromptTemplatePipeline.fromJson(ptbkjson);
    }

    /**
     * Constructs PromptTemplatePipeline from JSON source
     *
     * Note: During the construction the source is logic validated
     *
     * @param ptbkjson content of .ptbk.json file parsed into JSON
     * @returns PromptTemplatePipeline
     */
    public static fromJson(ptbkjson: PromptTemplatePipelineJson): PromptTemplatePipeline {
        validatePromptTemplatePipelineJson(ptbkjson);

        return new PromptTemplatePipeline(
            ptbkjson.ptbkUrl ? new URL(ptbkjson.ptbkUrl) : null,
            Object.fromEntries(ptbkjson.parameters.map((parameter) => [parameter.name, parameter])),
            ptbkjson.promptTemplates,
        );
    }

    private constructor(
        public readonly ptbkUrl: URL | null,
        public readonly parameters: Record<string_name, PromptTemplateParameterJson>,
        public readonly promptTemplates: Array<PromptTemplateJson>,
    ) {
        if (promptTemplates.length === 0) {
            throw new Error('Prompt template pipeline must have at least one prompt template');
        }
    }

    /**
     * Returns the first prompt template in the pipeline
     */
    public get entryPromptTemplate(): PromptTemplateJson {
        return this.promptTemplates[0]!;
    }

    /**
     * Gets the parameter that is the result of given prompt template
     */
    public getResultingParameter(promptTemplateName: string_name): PromptTemplateParameterJson {
        const index = this.promptTemplates.findIndex(({ name }) => name === promptTemplateName);
        if (index === -1) {
            throw new Error('Prompt template is not in this pipeline');
        }

        const resultingParameterName = this.promptTemplates[index]!.resultingParameterName;
        const resultingParameter = this.parameters[resultingParameterName];

        if (!resultingParameter) {
            //              <- TODO: [🥨] Make some NeverShouldHappenError
            throw new Error(
                `Resulting parameter of prompt template ${promptTemplateName} {${resultingParameterName}} is not defined`,
            );
        }

        return resultingParameter;
    }

    /**
     * Gets the following prompt template in the pipeline or null if there is no following prompt template and this is the last one
     */
    public getFollowingPromptTemplate(promptTemplateName: string_name): PromptTemplateJson | null {
        const index = this.promptTemplates.findIndex(({ name }) => name === promptTemplateName);
        if (index === -1) {
            throw new Error('Prompt template is not in this pipeline');
        }

        if (index === this.promptTemplates.length - 1) {
            return null;
        }

        return this.promptTemplates[index + 1]!;
    }
}

/**
 * TODO: !! [👐][🧠] Split of PromptTemplatePipeline,PromptTemplatePipelineLibrary between interface and class
 * TODO: !! [👐] Make parameters and promptTemplates private WHEN split between interface and class
 * TODO: !! Add generic type for entry and result parameters
 * TODO: Can be Array elegantly typed such as it must have at least one element?
 * TODO: [🧠] Each PromptTemplatePipeline should have its unique hash to be able to compare them and execute on server ONLY the desired ones
 */
