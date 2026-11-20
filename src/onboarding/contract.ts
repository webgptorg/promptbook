import { api, type ContractSchema } from '../vendor/app-platform.js';

/**
 * Prompt types from App's onboarding@1. The vendored schemas validate the wire values.
 *
 * @private onboarding
 */
export type OnboardingPrompt = {
    readonly id: string;
    readonly title: string;
    readonly question: string;
    readonly hint: string | null;
    readonly error: string | null;
    readonly canGoBack: boolean;
    readonly details?: readonly { readonly label: string; readonly text: string }[];
    readonly alternatives?: readonly { readonly id: string; readonly label: string; readonly description: string | null; readonly href: string | null }[];
} & (
    | { readonly kind: 'text'; readonly multiline: boolean; readonly required: boolean; readonly placeholder: string | null; readonly initial: string; readonly attachments: boolean }
    | { readonly kind: 'choice'; readonly multiple: boolean; readonly choices: readonly { id: string; label: string; description: string | null; disabled: boolean }[]; readonly initial: readonly string[] }
    | { readonly kind: 'confirm'; readonly confirmLabel: string; readonly declineLabel: string }
    | { readonly kind: 'upload'; readonly required: boolean; readonly maxFiles: number }
    | { readonly kind: 'secret'; readonly label: string; readonly placeholder: string | null; readonly helpUrl: string | null }
    | { readonly kind: 'harness-login'; readonly harness: string; readonly method: 'device-code' | 'return-code'; readonly url: string; readonly userCode: string | null; readonly status: 'waiting' | 'verifying' | 'succeeded' | 'failed' | 'expired' | 'denied' | 'unsupported'; readonly diagnostic: string | null; readonly expiresAt: string | null }
);

/** Content-free work facts rendered by the platform's signed setup UI. @private onboarding */
export type OnboardingActivity = { readonly id: string; readonly label: string; readonly status: 'running' | 'done' | 'failed' | 'skipped'; readonly detail: string | null };

/** The current state, returned by both the private control socket and the authenticated App API. @private onboarding */
export type OnboardingState = {
    readonly status: 'pending' | 'working' | 'completed';
    readonly deferred: boolean;
    readonly canDefer: boolean;
    readonly activity: readonly OnboardingActivity[];
    readonly progress: { readonly step: number; readonly of: number } | null;
    readonly prompt: OnboardingPrompt | null;
};

/** A validated response to exactly one presentation of a prompt. @private onboarding */
export type OnboardingReply = { readonly promptId: string } & (
    | { readonly action: 'back' }
    | { readonly action: 'alternative'; readonly alternativeId: string }
    | { readonly action: 'answer'; readonly answer:
        | { readonly kind: 'text'; readonly text: string; readonly fileIds: string[] }
        | { readonly kind: 'choice'; readonly choiceIds: string[] }
        | { readonly kind: 'confirm'; readonly confirmed: boolean }
        | { readonly kind: 'upload'; readonly fileIds: string[] }
        | { readonly kind: 'secret'; readonly value: string }
        | { readonly kind: 'harness-login'; readonly returnCode: string | null } }
);

/** The same strict reply validator used for the App API. @private onboarding */
export const onboardingReply = api.ENGINE_API_ROUTES.answerOnboarding!.body!.schema as ContractSchema<OnboardingReply>;

/** Returned for an initialized engine. @private onboarding */
export const completedOnboarding: OnboardingState = { status: 'completed', deferred: false, canDefer: true, activity: [], progress: null, prompt: null };
