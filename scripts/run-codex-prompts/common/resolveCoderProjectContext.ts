import { DEFAULT_CODER_AGENT_ROLE } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { resolveCoderAgentBook, type ResolvedCoderAgentBook } from './resolveCoderAgent';
import { resolveCoderContext } from './resolveCoderContext';

/** Read-only inputs resolved once before installations, Book initialization or execution. */
export type ResolvedCoderProjectContext = {
    readonly projectPath: string;
    readonly agentBook?: ResolvedCoderAgentBook;
    readonly context?: string;
};

/**
 * Resolves single-agent execution/authoring defaults without compiling Books or creating artifacts.
 * Execution previews use the same identity and routing. Utilities and all-agent discovery resolve
 * only the project directory and must not call this service to manufacture a primary-agent filter.
 */
export async function resolveCoderProjectContext(options: {
    readonly projectPath: string;
    readonly agent?: string;
    readonly context?: string;
}): Promise<ResolvedCoderProjectContext> {
    const agentBook = await resolveCoderAgentBook(options.agent, options.projectPath, {
        defaultRole: DEFAULT_CODER_AGENT_ROLE,
    });
    const context = await resolveCoderContext(options.context, options.projectPath);
    return { projectPath: options.projectPath, agentBook, context };
}
