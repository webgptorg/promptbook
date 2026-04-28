import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { TranspiledTeamMemberInput } from './TranspiledTeamHierarchy';

/**
 * Options for the BookTranspiler.
 *
 * @public exported from `@promptbook/core`
 */
export type BookTranspilerOptions = Omit<CommonToolsOptions, 'maxRequestsPerMinute'> & {
    /**
     * If true, the transpiler will log verbose information to the console.
     *
     * @default false
     */
    readonly isVerbose?: boolean;

    /**
     * If true, the transpiler will include comments in the output.
     *
     * @default true
     */
    readonly shouldIncludeComments?: boolean;

    /**
     * Recursive TEAM hierarchy pre-resolved by the export page.
     *
     * When provided, transpilers embed the full hierarchy into the generated code instead of
     * deriving only the direct teammates from the Book source.
     */
    readonly teamHierarchy?: ReadonlyArray<TranspiledTeamMemberInput>;

    /**
     * TODO: [🧠] What other options should be here?
     */
};
