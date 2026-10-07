import type { OnboardingOperation } from './createOnboardingSession';

/**
 * Accepts success, failure and settlement only for the current request revision.
 * Abort is an optimization; the ownership check also handles uncancellable responses.
 */
export async function runOnboardingOperation<Result>(
    operation: OnboardingOperation,
    work: (signal: AbortSignal) => Promise<Result>,
    onSuccess: (result: Result) => void,
    onError: (error: unknown) => void,
    onSettled?: () => void,
): Promise<void> {
    try {
        const result = await work(operation.signal);
        if (operation.isCurrent()) {
            onSuccess(result);
        }
    } catch (error) {
        if (operation.isCurrent()) {
            onError(error);
        }
    } finally {
        if (operation.isCurrent()) {
            onSettled?.();
        }
        operation.finish();
    }
}
