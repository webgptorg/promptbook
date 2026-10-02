/**
 * Waits for the next idle poll interval in multi-agent watch mode.
 *
 * @private function of `runMultipleAgentMessages`
 */
export async function wait(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}
