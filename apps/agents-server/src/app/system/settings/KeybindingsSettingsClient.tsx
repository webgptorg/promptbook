'use client';

import { useMemo } from 'react';
import { useChatEnterBehaviorPreferences } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { ChatEnterBehaviorOptionCard } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorOptionCard';
import type { AgentsServerChatEnterBehavior } from '@/src/utils/chatEnterBehaviorSettings';

/**
 * Client-side settings surface for chat keybindings.
 */
export function KeybindingsSettingsClient() {
    const { storedEnterBehavior, isLoading, isPersisting, setEnterBehavior } = useChatEnterBehaviorPreferences();

    const helperText = useMemo(() => {
        if (isLoading) {
            return 'Loading your current keybinding preference…';
        }

        if (isPersisting) {
            return 'Saving your keybinding preference…';
        }

        if (storedEnterBehavior) {
            return 'Saved for this browser user, including anonymous chat sessions tied to this browser.';
        }

        return 'No preference saved yet. The first Enter press in chat will ask, and the Send button always works.';
    }, [isLoading, isPersisting, storedEnterBehavior]);

    /**
     * Applies one selected Enter-key behavior.
     */
    const handleSelectBehavior = (behavior: AgentsServerChatEnterBehavior) => {
        void setEnterBehavior(behavior);
    };

    return (
        <div className="space-y-8">
            <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.4),_transparent_34%),linear-gradient(155deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="space-y-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
                        Keybindings
                    </p>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-slate-950">Chat composer</h2>
                        <p className="max-w-3xl text-sm leading-7 text-slate-600">
                            Choose what plain Enter does in chat. Ctrl+Enter always performs the opposite action, and
                            the Send button stays available in every mode.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <ChatEnterBehaviorOptionCard
                        behavior="SEND"
                        isSelected={storedEnterBehavior === 'SEND'}
                        onClick={() => handleSelectBehavior('SEND')}
                    />
                    <ChatEnterBehaviorOptionCard
                        behavior="NEWLINE"
                        isSelected={storedEnterBehavior === 'NEWLINE'}
                        onClick={() => handleSelectBehavior('NEWLINE')}
                    />
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                    {helperText}
                </div>
            </section>
        </div>
    );
}
