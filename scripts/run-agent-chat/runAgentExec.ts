import { NotAllowed } from '../../src/errors/NotAllowed';
import { resolveInlineOrFileText } from '../run-codex-prompts/common/resolveInlineOrFileText';
import type { AgentCliRunOptions } from './AgentCliRunOptions';
import { executeAgentChatTurn } from './executeAgentChatTurn';

/**
 * Options for `ptbk agent exec`.
 */
export type RunAgentExecOptions = AgentCliRunOptions & {
    readonly message: string;
};

/**
 * Runs one non-interactive local agent turn and prints the final agent answer.
 */
export async function runAgentExec(options: RunAgentExecOptions): Promise<string> {
    const message = options.message.trim();

    if (!message) {
        throw new NotAllowed('Pass a non-empty user message in `--message`.');
    }

    const currentWorkingDirectory = options.currentWorkingDirectory || process.cwd();
    const context = await resolveInlineOrFileText({
        textReference: options.context,
        currentWorkingDirectory,
        contextLabel: 'Agent context',
        optionName: '--context',
    });
    const result = await executeAgentChatTurn({
        ...options,
        currentWorkingDirectory,
        context,
        messages: [
            {
                sender: 'USER',
                content: message,
            },
        ],
    });

    console.info(result.answer);

    return result.answer;
}

