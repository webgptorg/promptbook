'use client';

import { useMemo } from 'react';
import { AgentProfileImage } from '../../../../components/AgentProfile/AgentProfileImage';
import { useAgentBackground } from '../../../../components/AgentProfile/useAgentBackground';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { useChatEnterBehaviorPreferences } from '../../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { getChatEnterBehaviorTextareaHint } from '../../../../components/ChatEnterBehavior/chatEnterBehaviorTranslations';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useAgentTextareaEnterHandling } from './useAgentTextareaEnterHandling';
import { useAgentTextareaSubmission } from './useAgentTextareaSubmission';

/**
 * Props for the minimal textarea-driven chat launcher.
 */
type AgentTextareaClientProps = {
    /**
     * Canonical agent identifier used to resolve chat route targets.
     */
    readonly agentName: string;

    /**
     * Human-friendly agent name rendered above the textarea.
     */
    readonly agentDisplayName: string;

    /**
     * Agent avatar URL rendered in a circular frame above the textarea.
     */
    readonly agentAvatarSrc: string;

    /**
     * Optional agent brand color used for profile-like page background.
     */
    readonly agentBrandColor?: string;

    /**
     * Placeholder rendered in the textarea input.
     */
    readonly inputPlaceholder: string;
};

/**
 * Minimal centered textarea surface that forwards prompts to the standard chat page.
 */
export function AgentTextareaClient({
    agentName,
    agentDisplayName,
    agentAvatarSrc,
    agentBrandColor,
    inputPlaceholder,
}: AgentTextareaClientProps) {
    const { formatText } = useAgentNaming();
    const { t } = useServerLanguage();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { backgroundImage } = useAgentBackground(agentBrandColor);
    const {
        handleSubmit,
        isSubmitDisabled,
        isSubmitting,
        messageContent,
        messageContentRef,
        setMessageContent,
        submitMessage,
    } = useAgentTextareaSubmission({ agentName });
    const { handleTextareaKeyDown, textareaRef } = useAgentTextareaEnterHandling({
        enterBehavior,
        messageContentRef,
        resolveEnterBehavior,
        setMessageContent,
        submitMessage,
    });
    const keybindingHint = useMemo(() => getChatEnterBehaviorTextareaHint(t, enterBehavior), [enterBehavior, t]);

    return (
        <main
            className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10"
            style={{
                background: `url("${backgroundImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <form onSubmit={handleSubmit} className="w-full max-w-3xl">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-white/80 bg-white/60 shadow-lg">
                        <AgentProfileImage src={agentAvatarSrc} alt={agentDisplayName} className="h-full w-full" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{agentDisplayName}</h1>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
                    <textarea
                        ref={textareaRef}
                        rows={12}
                        value={messageContent}
                        onChange={(event) => setMessageContent(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        disabled={isSubmitting}
                        placeholder={inputPlaceholder}
                        className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatText(keybindingHint)}</span>
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? formatText('Sending...') : formatText('Send')}
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}
