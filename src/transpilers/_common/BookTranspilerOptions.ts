import type { AgentReferenceResolver } from '../../book-2.0/agent-source/AgentReferenceResolver';
import type { TeammateProfileResolver } from '../../book-2.0/agent-source/TeammateProfileResolver';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { InlineKnowledgeSourceUploader } from '../../utils/knowledge/inlineKnowledgeSource';
import type { TranspiledTeamExport } from './TranspiledTeamExport';

/**
 * Options for the BookTranspiler.
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
     * Resolver that transforms compact agent references into concrete URLs before transpilation.
     */
    readonly agentReferenceResolver?: AgentReferenceResolver;

    /**
     * Optional hook used to upload inline knowledge files before finalizing transpiled model requirements.
     */
    readonly inlineKnowledgeSourceUploader?: InlineKnowledgeSourceUploader;

    /**
     * Optional resolver that provides actual agent names and descriptions for teammate URLs.
     */
    readonly teammateProfileResolver?: TeammateProfileResolver;

    /**
     * Built-in TEAM hierarchy resolved by Agents Server for self-contained transpiled exports.
     */
    readonly transpiledTeam?: TranspiledTeamExport;

    /**
     * TODO: [🧠] What other options should be here?
     */
};
