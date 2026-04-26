import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { TranspiledTeamMember } from './TranspiledTeamMember';

/**
 * Options shared by the Book transpilers.
 *
 * @private internal utility of Book transpilers
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
     * Optional TEAM hierarchy baked into the generated transpiled code.
     *
     * When omitted, transpilers fall back to the direct teammates parsed from the Book source.
     */
    readonly teamHierarchy?: ReadonlyArray<TranspiledTeamMember>;

    /**
     * TODO: [🧠] What other options should be here?
     */
};
