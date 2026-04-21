'use client';

import { Keyboard, MoonStar, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { createAppearancePreferenceOptions, getAppearanceLabel } from '@/src/components/Appearance/appearanceLabels';
import { useAppearance } from '@/src/components/Appearance/AppearanceProvider';
import { useChatEnterBehaviorPreferences } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { ChatEnterBehaviorSettingsPanel } from '@/src/components/ChatEnterBehavior/ChatEnterBehaviorSettingsPanel';
import { useServerLanguage } from '@/src/components/ServerLanguage/ServerLanguageProvider';

/**
 * Props for one reusable settings section surface.
 */
type SettingsSectionCardProps = {
    readonly icon: LucideIcon;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly isDarkMode: boolean;
    readonly children: ReactNode;
};

/**
 * Shared styled section card used across the system settings page.
 */
function SettingsSectionCard({
    icon: Icon,
    eyebrow,
    title,
    description,
    isDarkMode,
    children,
}: SettingsSectionCardProps) {
    return (
        <section
            className={`rounded-[32px] border p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${
                isDarkMode
                    ? 'border-slate-700 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(155deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.96))] shadow-[0_24px_70px_rgba(2,6,23,0.34)]'
                    : 'border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.4),_transparent_34%),linear-gradient(155deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))]'
            }`}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                    <p
                        className={`text-[0.7rem] font-semibold uppercase tracking-[0.34em] ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                    >
                        {eyebrow}
                    </p>
                    <div className="space-y-2">
                        <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-slate-50' : 'text-slate-950'}`}>
                            {title}
                        </h2>
                        <p
                            className={`max-w-3xl text-sm leading-7 ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-600'
                            }`}
                        >
                            {description}
                        </p>
                    </div>
                </div>

                <span
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isDarkMode ? 'bg-slate-800 text-sky-200' : 'bg-white/90 text-sky-700'
                    } shadow-sm`}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
            </div>

            <div className="mt-6">{children}</div>
        </section>
    );
}

/**
 * Client-side settings surface for browser-side appearance and chat preferences.
 */
export function KeybindingsSettingsClient() {
    const { t } = useServerLanguage();
    const { appearance, resolvedAppearance, setAppearance } = useAppearance();
    const { storedEnterBehavior, isLoading, isPersisting, setStoredEnterBehavior } = useChatEnterBehaviorPreferences();
    const appearanceOptions = createAppearancePreferenceOptions(t);
    const resolvedAppearanceLabel = getAppearanceLabel(t, resolvedAppearance);
    const isDarkMode = resolvedAppearance === 'dark';

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <p className={`text-xs uppercase tracking-[0.4em] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    {t('header.systemMenuLabel')}
                </p>
                <h1 className={`text-3xl font-semibold ${isDarkMode ? 'text-slate-50' : 'text-gray-900'}`}>
                    {t('header.settings')}
                </h1>
                <p className={`max-w-3xl text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {t('systemSettings.pageDescription')}
                </p>
            </div>

            <SettingsSectionCard
                icon={MoonStar}
                eyebrow={t('appearance.title')}
                title={t('appearance.title')}
                description={t('appearance.subtitle')}
                isDarkMode={isDarkMode}
            >
                <div className="space-y-3">
                    <label
                        htmlFor="appearance-mode"
                        className={`block text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                    >
                        {t('appearance.selectLabel')}
                    </label>
                    <select
                        id="appearance-mode"
                        value={appearance}
                        onChange={(event) => setAppearance(event.target.value as typeof appearance)}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 md:max-w-sm ${
                            isDarkMode
                                ? 'border-slate-700 bg-slate-950 text-slate-100'
                                : 'border-slate-200 bg-white text-slate-900'
                        }`}
                    >
                        {appearanceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-3">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                                isDarkMode
                                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
                                    : 'border-sky-200 bg-sky-50 text-sky-800'
                            }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('appearance.currentlyApplied', { appearance: resolvedAppearanceLabel })}
                        </span>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {t('appearance.help')}
                        </p>
                    </div>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                icon={Keyboard}
                eyebrow={t('chatEnterBehavior.sectionEyebrow')}
                title={t('chatEnterBehavior.sectionTitle')}
                description={t('chatEnterBehavior.sectionDescription')}
                isDarkMode={isDarkMode}
            >
                <ChatEnterBehaviorSettingsPanel
                    storedEnterBehavior={storedEnterBehavior}
                    isLoading={isLoading}
                    isPersisting={isPersisting}
                    onSelectBehavior={(behavior) => {
                        void setStoredEnterBehavior(behavior);
                    }}
                />
            </SettingsSectionCard>
        </div>
    );
}
