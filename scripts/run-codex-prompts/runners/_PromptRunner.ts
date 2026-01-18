export type PromptRunOptions = {
    prompt: string;
    scriptPath: string;
    projectPath: string;
};
export type PromptRunner = {
    name: string;
    runPrompt(options: PromptRunOptions): Promise<void>;
};
