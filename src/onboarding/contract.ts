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
} & (
    | { readonly kind: 'text'; readonly multiline: boolean; readonly required: boolean; readonly placeholder: string | null; readonly initial: string; readonly attachments: boolean }
    | { readonly kind: 'choice'; readonly multiple: boolean; readonly choices: readonly { id: string; label: string; description: string | null; disabled: boolean }[]; readonly initial: readonly string[] }
    | { readonly kind: 'confirm'; readonly confirmLabel: string; readonly declineLabel: string }
    | { readonly kind: 'harness-login'; readonly harness: string; readonly method: 'device-code'; readonly url: string; readonly userCode: string | null; readonly status: 'waiting' | 'verifying' | 'failed' | 'expired' | 'denied' | 'unsupported'; readonly diagnostic: string | null; readonly expiresAt: string | null }
);

/** The current state, returned by both the private control socket and the authenticated App API. @private onboarding */
export type OnboardingState = {
    readonly status: 'pending' | 'working' | 'completed';
    readonly deferred: boolean;
    readonly progress: { readonly step: number; readonly of: number } | null;
    readonly prompt: OnboardingPrompt | null;
};

/** A validated response to exactly one presentation of a prompt. @private onboarding */
export type OnboardingReply = { readonly promptId: string } & (
    | { readonly action: 'back' }
    | { readonly action: 'answer'; readonly answer:
        | { readonly kind: 'text'; readonly text: string; readonly fileIds: string[] }
        | { readonly kind: 'choice'; readonly choiceIds: string[] }
        | { readonly kind: 'confirm'; readonly confirmed: boolean }
        | { readonly kind: 'upload'; readonly fileIds: string[] }
        | { readonly kind: 'harness-login'; readonly returnCode: string | null } }
);

/** The same strict reply validator used for the App API. @private onboarding */
export const onboardingReply = api.ENGINE_API_ROUTES.answerOnboarding!.body!.schema as ContractSchema<OnboardingReply>;

/** Returned for an initialized engine. @private onboarding */
export const completedOnboarding: OnboardingState = { status: 'completed', deferred: false, progress: null, prompt: null };
