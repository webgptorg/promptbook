import type { Usage } from '../../../src/execution/Usage';

export type PromptRunOptions = {
    prompt: string;
    scriptPath: string;
    projectPath: string;
};

export type PromptRunResult = {
    usage: Usage;
};

export type PromptRunner = {
    name: string;
    runPrompt(options: PromptRunOptions): Promise<PromptRunResult>;
};
