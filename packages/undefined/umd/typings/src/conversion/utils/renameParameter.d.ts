import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { string_name } from '../../types/typeAliases';
type RenameParameterOptions = {
    /**
     * Pipeline to search and replace for parameters
     * This pipeline is returned as copy with replaced parameters
     */
    readonly pipeline: PipelineJson;
    /**
     * Original parameter name that should be replaced
     */
    readonly oldParameterName: string_name;
    /**
     * New parameter name that should replace the original parameter name
     */
    readonly newParameterName: string_name;
};
/**
 * Function renameParameter will find all usable parameters for given prompt template
 * In other words, it will find all parameters that are not used in the prompt template itseld and all its dependencies
 *
 * @throws {PipelineLogicError} If the new parameter name is already used in the pipeline
 * @public exported from `@promptbook/utils`
 */
export declare function renameParameter(options: RenameParameterOptions): PipelineJson;
export {};
