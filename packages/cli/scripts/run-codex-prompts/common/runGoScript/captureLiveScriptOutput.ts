/** Original stream identity, retained independently of the dashboard projection. */
export type LiveScriptOutputSource = 'stdout' | 'stderr' | 'team';

/** A presentation observer returns true only while it owns terminal output. */
type LiveScriptOutputCapture = (chunk: string, source: LiveScriptOutputSource) => boolean;

/** Invocation-local terminal capture; no execution code depends on its contents. */
let liveScriptOutputCapture: LiveScriptOutputCapture | undefined;

/** Installs the dashboard's optional presentation sink and returns its disposer. */
export function subscribeToLiveScriptOutput(capture: LiveScriptOutputCapture): () => void {
    const previousCapture = liveScriptOutputCapture;
    liveScriptOutputCapture = capture;
    return () => {
        if (liveScriptOutputCapture === capture) liveScriptOutputCapture = previousCapture;
    };
}

/** Offers an already produced chunk to the dashboard. A display failure cannot fail a script. */
export function captureLiveScriptOutput(chunk: string | (() => string), source: LiveScriptOutputSource): boolean {
    try {
        return liveScriptOutputCapture?.(typeof chunk === 'function' ? chunk() : chunk, source) ?? false;
    } catch {
        return false;
    }
}
