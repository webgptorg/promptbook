import { createId } from '../lib/id';
import type { OnboardingDraftState } from '../types';
import { createInitialOnboardingState } from './createInitialOnboardingState';

/** Atomic update owned by one draft, including concurrent upload updates. */
export type OnboardingPatch =
    | Partial<OnboardingDraftState>
    | ((previous: OnboardingDraftState) => Partial<OnboardingDraftState>);

/** Cancellation and revision guard for one operation within one session. */
export type OnboardingOperation = {
    readonly signal: AbortSignal;
    readonly isCurrent: () => boolean;
    readonly cancel: () => void;
    readonly finish: () => void;
};

/** A controller-owned lifetime and provider-owned draft; never shared across new-agent requests. */
export type OnboardingSession = ReturnType<typeof createOnboardingSession>;

/**
 * Starts a fresh session before mounting the provider. The store survives provider/step remounts,
 * so Strict Mode and revisiting completion cannot submit an in-flight creation twice.
 * Host exits invalidate synchronously, before React unmounts or late callbacks can run.
 */
export function createOnboardingSession(scope?: string) {
    const id = createId();
    let state = createInitialOnboardingState();
    let isActive = true;
    let isDraftActive = true;
    let isCompleted = false;
    const listeners = new Set<() => void>();
    const operations = new Map<string, OnboardingOperation>();

    /** Cancels only this session's named operation, leaving concurrent uploads intact. */
    function cancelOperation(key: string): void {
        operations.get(key)?.cancel();
    }

    /** Publishes one synchronous state transition to mounted providers. */
    function publish(nextState: OnboardingDraftState): void {
        state = nextState;
        if (isActive) {
            listeners.forEach((listener) => listener());
        }
    }

    /** Accepts changes only while this draft is still owned by its host. */
    function update(patch: OnboardingPatch): void {
        if (!isActive || !isDraftActive) {
            return;
        }
        const resolved = typeof patch === 'function' ? patch(state) : patch;
        if (isCompleted) {
            // Completion remains navigable, but cannot accept further draft edits or results.
            if (resolved.currentPath) publish({ ...state, currentPath: resolved.currentPath });
            return;
        }
        let nextState = { ...state, ...resolved };
        const isAssignmentChanged =
            nextState.agentName !== state.agentName || nextState.agentBrief !== state.agentBrief;
        const isBookChanged = nextState.bookSource !== state.bookSource;
        if (isAssignmentChanged || isBookChanged) {
            cancelOperation('book');
            if (nextState.bookGeneration.phase === 'generating') {
                nextState = { ...nextState, bookGeneration: { phase: 'ready', error: null } };
            }
        }
        if (isBookChanged || nextState.knowledge !== state.knowledge) {
            cancelOperation('chat');
            cancelOperation('email');
            nextState = {
                ...nextState,
                isSendingTestMessage: false,
                emailTest: { ...nextState.emailTest, isEvaluating: false, phase: 'idle' },
            };
        }
        if (nextState.testEmail !== state.testEmail) {
            cancelOperation('email');
            nextState = { ...nextState, emailTest: { ...nextState.emailTest, phase: 'idle', isEvaluating: false } };
        }
        publish(nextState);
    }

    /** Starts a request revision; acceptance remains guarded even if abort cannot stop the server. */
    function beginOperation(key: string): OnboardingOperation | null {
        if (!isActive || isCompleted || (!isDraftActive && key !== 'creation')) {
            return null;
        }
        cancelOperation(key);
        const controller = new AbortController();
        const operation: OnboardingOperation = {
            signal: controller.signal,
            isCurrent: () => isActive && !isCompleted && operations.get(key) === operation,
            cancel: () => {
                controller.abort();
                operation.finish();
            },
            finish: () => {
                if (operations.get(key) === operation) {
                    operations.delete(key);
                }
            },
        };
        operations.set(key, operation);
        return operation;
    }

    /** Ends eligibility for updates, without deleting uploaded objects or already created agents. */
    function end(): void {
        isActive = false;
        isDraftActive = false;
        operations.forEach((operation) => operation.cancel());
    }

    /**
     * Transfers the composed Book to the classic editor within the same creation lifetime.
     * Pending draft work loses ownership, but an already submitted save must not be duplicated.
     */
    function handoff(): void {
        isDraftActive = false;
        operations.forEach((operation, key) => {
            if (key !== 'creation') operation.cancel();
        });
    }

    /**
     * Associates even a late server success with its original operation. The ended store never
     * notifies a replacement dialog, and this identity prevents retrying a known successful save.
     */
    function complete(agent: { readonly permanentId: string; readonly targetPath: string }): void {
        if (isCompleted) {
            return;
        }
        isCompleted = true;
        operations.forEach((operation) => operation.cancel());
        publish({
            ...state,
            savedAgentId: agent.permanentId,
            savedAgentTargetPath: agent.targetPath,
            isCreatingAgent: false,
            creationError: null,
            isSendingTestMessage: false,
            bookGeneration: { phase: 'ready', error: null },
            emailTest: { ...state.emailTest, isEvaluating: false },
        });
    }

    return {
        id,
        scope,
        getState: () => state,
        isActive: () => isActive,
        isOperationPending: (key: string) => operations.has(key),
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        update,
        beginOperation,
        cancelOperation,
        complete,
        handoff,
        end,
    } as const;
}
