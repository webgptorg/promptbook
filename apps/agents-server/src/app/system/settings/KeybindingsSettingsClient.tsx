'use client';

import { useChatEnterBehaviorPreferences } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { ChatEnterBehaviorSettingsPanel } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorSettingsPanel';
import { useServerLanguage } from '@/src/components/ServerLanguage/ServerLanguageProvider';

/**
 * Client-side settings surface for chat keybindings.
 */
export function KeybindingsSettingsClient() {
    const { t } = useServerLanguage();
    const { storedEnterBehavior, isLoading, isPersisting, setStoredEnterBehavior } = useChatEnterBehaviorPreferences();

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-slate-500">
                    {t('header.systemMenuLabel')}
                </p>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">{t('header.settings')}</h1>
                <p className="max-w-3xl text-sm text-gray-600 dark:text-slate-300">
                    {t('systemSettings.pageDescription')}
                </p>
            </div>

            <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.4),_transparent_34%),linear-gradient(155deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(8,15,28,0.96))] dark:shadow-[0_24px_70px_rgba(2,6,23,0.42)]">
                <div className="space-y-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
                        {t('chatEnterBehavior.sectionEyebrow')}
                    </p>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">
                            {t('chatEnterBehavior.sectionTitle')}
                        </h2>
                        <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {t('chatEnterBehavior.sectionDescription')}
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <ChatEnterBehaviorSettingsPanel
                        storedEnterBehavior={storedEnterBehavior}
                        isLoading={isLoading}
                        isPersisting={isPersisting}
                        onSelectBehavior={(behavior) => {
                            void setStoredEnterBehavior(behavior);
                        }}
                    />
                </div>
            </section>
        </div>
    );
}
