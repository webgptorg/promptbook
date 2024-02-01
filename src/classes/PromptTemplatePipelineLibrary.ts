import { string_name } from '.././types/typeAliases';
import { createPtpExecutor, CreatePtpExecutorSettings } from '../execution/createPtpExecutor';
import { ExecutionTools } from '../execution/ExecutionTools';
import { PtpExecutor } from '../execution/PtpExecutor';
import { Prompt } from '../types/Prompt';
import { PromptTemplatePipelineJson } from '../types/PromptTemplatePipelineJson/PromptTemplatePipelineJson';
import { PromptTemplatePipelineString } from '../types/PromptTemplatePipelineString';
import { PromptTemplatePipeline } from './PromptTemplatePipeline';

type PromptTemplatePipelineLibraryOptions = {
    readonly library: Record<string_name, PromptTemplatePipeline>;
    readonly settings: CreatePtpExecutorSettings;
};

/**
 * Library of prompt template pipelines that groups together prompt template pipelines for an application. This is a very thin wrapper around the Array / Set of prompt template pipelines.
 *
 * Prompt Template Pipeline library is a useful helper in execution, it can be shared between execution and consumer parts of the app and make common knowledge about prompt template pipelines.
 *
 * It allows to create executor functions from prompt template pipelines in the library.
 *
 * @see https://github.com/webgptorg/promptbook#prompt-template-pipeline-library
 */
export class PromptTemplatePipelineLibrary {
    /**
     * Constructs PromptTemplatePipeline from any sources
     *
     * Note: During the construction syntax and logic of all sources are validated
     * Note: You can combine .ptbk.md and .ptbk.json files BUT it is not recommended
     *
     * @param ptbkSources contents of .ptbk.md or .ptbk.json files
     * @returns PromptTemplatePipelineLibrary
     */
    public static fromSources(
        ptbkSources: Record<string_name, PromptTemplatePipelineJson | PromptTemplatePipelineString>,
        settings: CreatePtpExecutorSettings,
    ): PromptTemplatePipelineLibrary {
        const library: Record<string_name, PromptTemplatePipeline> = {};
        for (const [name, source] of Object.entries(ptbkSources)) {
            library[name] = PromptTemplatePipeline.fromSource(source);
        }
        return new PromptTemplatePipelineLibrary({ library, settings });
    }

    private constructor(public readonly options: PromptTemplatePipelineLibraryOptions) {}

    /**
     * Gets prompt template pipeline by name
     */
    public getPtp(name: string_name): PromptTemplatePipeline {
        const promptTemplatePipeline = this.options.library[name];
        if (!promptTemplatePipeline) {
            throw new Error(`Prompt template pipeline with name "${name}" not found`);
        }
        return promptTemplatePipeline;
    }

    /**
     * Checks whether prompt is in the library
     */
    public isPromptInLibrary(prompt: Prompt): boolean {
        // TODO: [🎛] DO not hardcode this, really validate whether the prompt is in the library
        prompt;
        return true;
    }

    /**
     * Gets executor function for given prompt template pipeline
     */
    public createExecutor(name: string_name, tools: ExecutionTools): PtpExecutor {
        const ptp = this.getPtp(name);
        return createPtpExecutor({ ptp, tools, settings: this.options.settings });
    }
}

/**
 * TODO: !!! This should be renamed to Promptbook
 * TODO: !! [👐][🧠] Split of PromptTemplatePipeline,PromptTemplatePipelineLibrary between interface and class
 * TODO: !! [👐] Make promptTemplatePipelines private WHEN split between interface and class
 * TODO: [🧠] Maybe isPromptInLibrary should be separate utility function
 * TODO: [🧠] Maybe createExecutor should be separate utility function
 * TODO: Static method fromDirectory
 * TODO: [🤜] Add generic type for entry and result parameters
 * TODO: [🧠] Is it better to ptbkLibrary.executePtp('writeXyz',{...}) OR ptbkLibrary.createExecutor('writeXyz')({...}) OR createExecutor(ptbkLibrary.getPtp('writeXyz'))
 * TODO: [🧠] Formarly (before commit 62229afce7668a5b85077cc18becf798b583bf8d) there were two classes PromptTemplatePipelineLibrary+PtpLibraryExecutor (maybe it was better?)
 * TODO: [🧠] Is it better to pass tools into getExecutor or into constructor
 *             Maybe it is not a good idea to cache executors when they are can be created with different tools
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 */
