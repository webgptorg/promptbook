import type { CodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { CoderRunStep, CoderRunStepKind } from './CoderRunStep';

/**
 * Progress of one prompt round, reported right before a new step starts.
 */
export type CoderRunStepProgress = {
    /**
     * Kind of the step which is about to start.
     */
    readonly startedStepKind: CoderRunStepKind;

    /**
     * Steps of the same prompt round which have already finished, in the order they ran.
     */
    readonly finishedSteps: ReadonlyArray<CoderRunStep>;

    /**
     * Authentication method the harness reported, as soon as one of the finished steps revealed it.
     */
    readonly loginMethod?: CodexLoginMethod;
};

/**
 * Notified right before one coder run step starts.
 */
export type OnCoderRunStepStarted = (progress: CoderRunStepProgress) => Promise<void>;

/**
 * Collects the measured steps of one prompt round and announces every step which starts.
 */
export type CoderRunStepTracker = {
    /**
     * Steps which have finished so far, in the order they ran.
     */
    readonly steps: ReadonlyArray<CoderRunStep>;

    /**
     * Announces that one step is about to start.
     */
    readonly startStep: (kind: CoderRunStepKind) => Promise<void>;

    /**
     * Records one finished step together with the authentication method its runner reported.
     */
    readonly finishStep: (step: CoderRunStep, loginMethod?: CodexLoginMethod) => void;
};

/**
 * Creates the step tracker of one prompt round.
 *
 * The tracker is the single place which knows which steps have finished and which one is running,
 * so both the finished `[x]` status line and the intermediate `[^]` in-progress status lines are
 * built from the very same data.
 */
export function createCoderRunStepTracker(onStepStarted?: OnCoderRunStepStarted): CoderRunStepTracker {
    const steps: Array<CoderRunStep> = [];
    let reportedLoginMethod: CodexLoginMethod | undefined;

    return {
        steps,
        async startStep(kind: CoderRunStepKind): Promise<void> {
            await onStepStarted?.({
                startedStepKind: kind,
                finishedSteps: [...steps],
                loginMethod: reportedLoginMethod,
            });
        },
        finishStep(step: CoderRunStep, loginMethod?: CodexLoginMethod): void {
            steps.push(step);
            reportedLoginMethod = loginMethod ?? reportedLoginMethod;
        },
    };
}
