import type { ChatMessage } from '../../src/book-components/Chat/types/ChatMessage';
import type { ThinkingLevel } from '../../src/cli/cli-commands/coder/ThinkingLevel';
import type { PromptRunnerHarnessName } from '../../src/cli/cli-commands/common/promptRunnerCliOptions';

/**
 * Shared runner options accepted by `ptbk agent chat` and `ptbk agent exec`.
 */
export type AgentCliRunnerOptions = {
    readonly agentName?: PromptRunnerHarnessName;
    readonly model?: string;
    readonly isVerbose: boolean;
    readonly noUi: boolean;
    readonly thinkingLevel?: ThinkingLevel;
    readonly allowCredits: boolean;
};

/**
 * One text chat message persisted into the temporary message book.
 */
export type AgentCliHistoryMessage = Pick<ChatMessage, 'content'> & {
    readonly sender: 'USER' | 'AGENT';
};

/**
 * Shared local-agent command options.
 */
export type AgentCliRunOptions = AgentCliRunnerOptions & {
    readonly agentPath: string;
    readonly context?: string;
    readonly currentWorkingDirectory?: string;
};
