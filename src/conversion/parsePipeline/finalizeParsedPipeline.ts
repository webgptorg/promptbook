import type { $PipelineJson } from '../../commands/_common/types/CommandParser';
import { ORDER_OF_PIPELINE_JSON } from '../../constants';
import { HIGH_LEVEL_ABSTRACTIONS } from '../../high-level-abstractions/index';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * Applies postprocessing and exports the parsed pipeline JSON.
 *
 * @private internal utility of `parsePipeline`
 */
export function finalizeParsedPipeline($pipelineJson: $PipelineJson): PipelineJson {
    applyImplicitParameterDirections($pipelineJson);
    removeUndefinedValuesFromPipeline($pipelineJson);
    applySyncHighLevelAbstractions($pipelineJson);
    ensurePipelineFormfactor($pipelineJson);

    return exportParsedPipelineJson($pipelineJson);
}

/**
 * Applies default INPUT/OUTPUT flags when the author did not specify them explicitly.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function applyImplicitParameterDirections($pipelineJson: $PipelineJson): void {
    markImplicitInputParameters($pipelineJson);
    markImplicitOutputParameters($pipelineJson);
}

/**
 * Marks non-result parameters as pipeline inputs when no input was declared.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function markImplicitInputParameters($pipelineJson: $PipelineJson): void {
    if ($pipelineJson.parameters.some((parameter) => parameter.isInput)) {
        return;
    }

    for (const parameter of $pipelineJson.parameters) {
        const isThisParameterResulting = $pipelineJson.tasks.some(
            (task) => task.resultingParameterName === parameter.name,
        );

        if (!isThisParameterResulting) {
            parameter.isInput = true as TODO_any;
            // <- TODO: [💔] Why this is making typescript error in vscode but not in cli
            //        > Type 'true' is not assignable to type 'false'.ts(2322)
            //        > (property) isInput: false
            //        > The parameter is input of the pipeline The parameter is NOT input of the pipeline
        }
    }
}

/**
 * Marks every non-input parameter as output when no output was declared.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function markImplicitOutputParameters($pipelineJson: $PipelineJson): void {
    if ($pipelineJson.parameters.some((parameter) => parameter.isOutput)) {
        return;
    }

    for (const parameter of $pipelineJson.parameters) {
        if (!parameter.isInput) {
            parameter.isOutput = true as TODO_any;
            // <- TODO: [💔]
        }
    }
}

/**
 * Removes `undefined` properties from serialized tasks and parameters.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function removeUndefinedValuesFromPipeline($pipelineJson: $PipelineJson): void {
    $pipelineJson.tasks.forEach(removeUndefinedProperties);
    $pipelineJson.parameters.forEach(removeUndefinedProperties);
}

/**
 * Deletes all own properties with `undefined` values from a mutable JSON entity.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function removeUndefinedProperties(entity: chococake): void {
    for (const [key, value] of Object.entries(entity)) {
        if (value === undefined) {
            delete entity[key];
        }
    }
}

/**
 * Applies all sync-only high-level abstractions after parsing.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function applySyncHighLevelAbstractions($pipelineJson: $PipelineJson): void {
    for (const highLevelAbstraction of HIGH_LEVEL_ABSTRACTIONS.filter(({ type }) => type === 'SYNC')) {
        highLevelAbstraction.$applyToPipelineJson($pipelineJson);
    }
}

/**
 * Ensures parsed pipelines always have the default `GENERIC` formfactor.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function ensurePipelineFormfactor($pipelineJson: $PipelineJson): void {
    // Note: [🔆] If formfactor is still not set, set it to 'GENERIC'
    if ($pipelineJson.formfactorName === undefined) {
        $pipelineJson.formfactorName = 'GENERIC';
    }
}

/**
 * Finalizes ordering and exports the parsed pipeline JSON.
 *
 * @private internal utility of `finalizeParsedPipeline`
 */
function exportParsedPipelineJson($pipelineJson: $PipelineJson): PipelineJson {
    return exportJson({
        name: 'pipelineJson',
        message: `Result of \`parsePipeline\``,
        order: ORDER_OF_PIPELINE_JSON,
        value: {
            formfactorName: 'GENERIC',
            // <- Note: [🔆] Setting `formfactorName` is redundant to satisfy the typescript

            ...($pipelineJson as $PipelineJson),
        },
    });
}

// TODO: Use spaceTrim more effectively
// TODO: [🧠] Parameter flags - isInput, isOutput, isInternal
// TODO: [♈] Probably move expectations from tasks to parameters
// TODO: [🍙] Make some standard order of json properties
