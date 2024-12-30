import { $PipelineJson } from '../../commands/_common/types/CommandParser';

/**
 * Used in `pipelineStringToJsonSync`
 *
 * @private
 */
export type SyncHighLevelAbstraction = /* CommonHighLevelAbstraction & */ {
    type: 'SYNC';

    /**
     * Apply the abstraction to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     */
    $applyToPipelineJson($pipelineJson: $PipelineJson): void;
};

/*
TODO: [😂] Make `AsyncHighLevelAbstraction`
/**
 * Used in `preparePipeline`
 *
 * @private
 * /
export type AsyncHighLevelAbstraction = /* CommonHighLevelAbstraction & * / {
    type: 'ASYNC';

    /**
     * Apply the abstraction to the `pipelineJson`
     *
     * Note: `$` is used to indicate that this function mutates given `pipelineJson`
     * /
    $applyToPipelineJson($pipelineJson: $PipelineJson): Promise<void>;
};
*/

/*
TODO: Remove or use
export type CommonHighLevelAbstraction = {
};
*/

/**
 * TODO: [♓️] Add order here
 * TODO: [🧠][🍱] Maybe make some common abstraction between `HighLevelAbstraction` and `CommandParser`
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
