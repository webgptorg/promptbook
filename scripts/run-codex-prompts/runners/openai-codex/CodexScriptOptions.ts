/**
 * Options for building the Codex shell script.
 */
export type CodexScriptOptions = {
    prompt: string;
    projectPath: string;
    model: string;
    sandbox: string;
    askForApproval: string;
    codexCommand: string;
};
