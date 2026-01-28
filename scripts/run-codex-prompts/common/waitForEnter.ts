import { createInterface } from 'readline';

/**
 * Waits for the user to press Enter before continuing.
 */
export async function waitForEnter(prompt: string): Promise<void> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await new Promise<void>((resolve) => {
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}
