import { createInterface } from 'readline';

/**
 * Prompts for a yes/no confirmation using stdin.
 * @private function of DeleteOpenAiResources
 */
export async function promptForConfirmation(promptText: string): Promise<boolean> {
    const answer = await askQuestion(promptText);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
}

/**
 * Asks a single question on stdin and resolves with the user response.
 * @private function of DeleteOpenAiResources
 */
async function askQuestion(promptText: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

