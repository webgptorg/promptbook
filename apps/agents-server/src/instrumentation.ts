/**
 * Registers startup hooks for the Agents Server runtime.
 *
 * @returns Promise that resolves after startup hooks are loaded.
 * @private internal startup hook for Agents Server runtime
 */
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const { registerNodeRuntimeInstrumentation } = await import('./instrumentation-node');
    await registerNodeRuntimeInstrumentation();
}
