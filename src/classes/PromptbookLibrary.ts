import { string_name } from '.././types/typeAliases';
import { promptbookStringToJson } from '../conversion/promptbookStringToJson';
import { validatePromptbookJson } from '../conversion/validatePromptbookJson';
import { createPtbkExecutor, CreatePtbkExecutorSettings } from '../execution/createPtbkExecutor';
import { ExecutionTools } from '../execution/ExecutionTools';
import { PtbkExecutor } from '../execution/PtbkExecutor';
import { Prompt } from '../types/Prompt';
import { PromptbookJson } from '../types/PromptbookJson/PromptbookJson';
import { PromptbookString } from '../types/PromptbookString';

/**
 * Options for PromptbookLibrary
 */
type PromptbookLibraryOptions = {
    /**
     * The library of promptbooks
     */
    readonly library: Record<string_name, PromptbookJson>;

    /**
     * Optional settings for creating a PromptbookExecutor
     */
    readonly settings?: Partial<CreatePtbkExecutorSettings>;
};

/**
 * Library of promptbooks that groups together promptbooks for an application. This is a very thin wrapper around the Array / Set of promptbooks.
 *
 * Promptbook library is a useful helper in execution, it can be shared between execution and consumer parts of the app and make common knowledge about promptbooks.
 *
 * It allows to create executor functions from promptbooks in the library.
 *
 * @see https://github.com/webgptorg/promptbook#prompt-template-pipeline-library
 */
export class PromptbookLibrary {
    /**
     * Constructs Promptbook from any sources
     *
     * Note: During the construction syntax and logic of all sources are validated
     * Note: You can combine .ptbk.md and .ptbk.json files BUT it is not recommended
     *
     * @param ptbkSources contents of .ptbk.md or .ptbk.json files
     * @param settings settings for creating executor functions
     * @returns PromptbookLibrary
     */
    public static fromSources(
        ptbkSources: Record<string_name, PromptbookJson | PromptbookString>,
        settings?: Partial<CreatePtbkExecutorSettings>,
    ): PromptbookLibrary {
        const library: Record<string_name, PromptbookJson> = {};
        for (const [name, source] of Object.entries(ptbkSources)) {
            if (typeof source === 'string') {
                // Note: When directly creating from string, no need to validate the source
                //       The validation is performed always before execution
                library[name] = promptbookStringToJson(source);
            } else {
                validatePromptbookJson(source);
                library[name] = source;
            }
        }
        return new PromptbookLibrary({ library, settings });
    }

    private constructor(private readonly options: PromptbookLibraryOptions) {}

    /**
     * Gets all promptbooks in the library
     */
    public get ptbkNames(): Array<string_name> {
        return Object.keys(this.options.library);
    }

    /**
     * Gets promptbook by name
     */
    public getPtbkByName(name: string_name): PromptbookJson {
        const promptbook = this.options.library[name];
        if (!promptbook) {
            throw new Error(`Promptbook with name "${name}" not found`);
        }
        return promptbook;
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
     * Gets executor function for given promptbook
     */
    public createExecutor(name: string_name, tools: ExecutionTools): PtbkExecutor {
        const ptbk = this.getPtbkByName(name);
        return createPtbkExecutor({ ptbk, tools, settings: this.options.settings });
    }
}

/**
 * TODO: [🈴] Identify promptbooks by url `ptbkUrls` + `getPtbkByUrl`
 * TODO: !!! This should be renamed to Promptbook
 * TODO: !! [👐][🧠] Split of Promptbook,PromptbookLibrary between interface and class
 * TODO: !! [👐] Make promptbooks private WHEN split between interface and class
 * TODO: [🧠] Maybe isPromptInLibrary should be separate utility function
 * TODO: [🧠] Maybe createExecutor should be separate utility function
 * TODO: Static method fromDirectory
 * TODO: [🤜] Add generic type for entry and result parameters
 * TODO: [🧠] Is it better to ptbkLibrary.executePtbk('writeXyz',{...}) OR ptbkLibrary.createExecutor('writeXyz')({...}) OR createExecutor(ptbkLibrary.getPtbk('writeXyz'))
 * TODO: [🧠] Formarly (before commit 62229afce7668a5b85077cc18becf798b583bf8d) there were two classes PromptbookLibrary+PtbkLibraryExecutor (maybe it was better?)
 * TODO: [🧠] Is it better to pass tools into getExecutor or into constructor
 *             Maybe it is not a good idea to cache executors when they are can be created with different tools
 * TODO: [👧] Strongly type the executors to avoid need of remove nullables whtn noUncheckedIndexedAccess in tsconfig.json
 */
