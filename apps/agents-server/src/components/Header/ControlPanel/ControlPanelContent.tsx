'use client';

import { CornerDownLeft, Languages, MessageSquare, MoonStar, Settings2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppearance } from '../../Appearance/AppearanceProvider';
import { ChatEnterBehaviorSettingsPanel } from '../../ChatEnterBehavior/ChatEnterBehaviorSettingsPanel';
import type {
    ControlPanelContentState,
    ControlPanelSelectSectionState,
    ControlPanelStatusTone,
} from './ControlPanelContentState';
import { useControlPanelContentState } from './useControlPanelContentState';

/**
 * Shared props used by every control panel presentation.
 *
 * @private function of HeaderControlPanelDropdown
 */
type ControlPanelContentProps = {
    readonly title?: string;
    readonly subtitle?: string;
    readonly isMobile?: boolean;
};

/**
 * Tone-specific styles used by compact control-center toggle tiles.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelToggleToneClasses = {
    readonly activeSurface: string;
    readonly iconWrap: string;
    readonly switchTrack: string;
    readonly stateBadge: string;
};

/**
 * Props for one compact status chip in the control panel summary.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelStatusBadgeProps = Pick<ControlPanelContentState['summaryBadges'][number], 'label' | 'tone'>;

/**
 * Props for the visual switch displayed in each toggle tile.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelToggleSwitchProps = {
    readonly isOn: boolean;
    readonly tone: ControlPanelStatusTone;
    readonly isDisabled?: boolean;
};

/**
 * Props for one compact toggle tile rendered inside the control-center grid.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelToggleTileProps = Omit<ControlPanelContentState['toggleTiles'][number], 'key'>;

/**
 * Props for one reusable control-panel card section.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSectionCardProps = {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly subtitle: string;
    readonly children: ReactNode;
};

/**
 * Props for the reusable select-based control-panel card.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSelectSectionProps = {
    readonly icon: LucideIcon;
    readonly section: ControlPanelSelectSectionState;
};

/**
 * Tailwind classes used by status chips for each visual tone.
 *
 * @private function of ControlPanelContent
 */
/**
 * Creates the tone-specific chip classes used by summary badges.
 *
 * @param isDarkMode - Indicates whether the dark theme is active.
 * @returns Tone-specific badge styling classes.
 * @private function of ControlPanelContent
 */
function createControlPanelStatusToneClassMap(isDarkMode: boolean): Record<ControlPanelStatusTone, string> {
    if (isDarkMode) {
        return {
            neutral: 'border-slate-700 bg-slate-800/90 text-slate-200',
            informative: 'border-sky-500/30 bg-sky-500/15 text-sky-100',
            positive: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100',
            danger: 'border-rose-500/30 bg-rose-500/15 text-rose-100',
        };
    }

    return {
        neutral: 'border-gray-200 bg-gray-50 text-gray-700',
        informative: 'border-blue-200 bg-blue-50 text-blue-700',
        positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        danger: 'border-rose-200 bg-rose-50 text-rose-700',
    };
}

/**
 * Creates the tone-specific class groups for toggle tiles.
 *
 * @param isDarkMode - Indicates whether the dark theme is active.
 * @returns Tone-specific toggle styling classes.
 * @private function of ControlPanelContent
 */
function createControlPanelToggleToneClassMap(
    isDarkMode: boolean,
): Record<ControlPanelStatusTone, ControlPanelToggleToneClasses> {
    if (isDarkMode) {
        return {
            neutral: {
                activeSurface:
                    'border-slate-600 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 text-slate-100',
                iconWrap: 'bg-slate-700 text-slate-100',
                switchTrack: 'bg-slate-500',
                stateBadge: 'border-slate-600 bg-slate-800/90 text-slate-100',
            },
            informative: {
                activeSurface:
                    'border-sky-500/35 bg-gradient-to-br from-sky-500/18 via-slate-900 to-sky-950/70 text-sky-50',
                iconWrap: 'bg-sky-500/20 text-sky-100',
                switchTrack: 'bg-sky-500',
                stateBadge: 'border-sky-500/35 bg-sky-500/15 text-sky-100',
            },
            positive: {
                activeSurface:
                    'border-emerald-500/35 bg-gradient-to-br from-emerald-500/18 via-slate-900 to-emerald-950/70 text-emerald-50',
                iconWrap: 'bg-emerald-500/20 text-emerald-100',
                switchTrack: 'bg-emerald-500',
                stateBadge: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-100',
            },
            danger: {
                activeSurface:
                    'border-rose-500/35 bg-gradient-to-br from-rose-500/18 via-slate-900 to-rose-950/70 text-rose-50',
                iconWrap: 'bg-rose-500/20 text-rose-100',
                switchTrack: 'bg-rose-500',
                stateBadge: 'border-rose-500/35 bg-rose-500/15 text-rose-100',
            },
        };
    }

    return {
        neutral: {
            activeSurface: 'border-slate-300 bg-gradient-to-br from-slate-100 to-white text-slate-700',
            iconWrap: 'bg-slate-200 text-slate-700',
            switchTrack: 'bg-slate-500',
            stateBadge: 'border-slate-300 bg-white/85 text-slate-700',
        },
        informative: {
            activeSurface: 'border-blue-200 bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-800',
            iconWrap: 'bg-blue-100 text-blue-700',
            switchTrack: 'bg-blue-500',
            stateBadge: 'border-blue-200 bg-blue-50 text-blue-700',
        },
        positive: {
            activeSurface:
                'border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-emerald-800',
            iconWrap: 'bg-emerald-100 text-emerald-700',
            switchTrack: 'bg-emerald-500',
            stateBadge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
        danger: {
            activeSurface: 'border-rose-200 bg-gradient-to-br from-rose-100 via-white to-rose-50 text-rose-800',
            iconWrap: 'bg-rose-100 text-rose-700',
            switchTrack: 'bg-rose-500',
            stateBadge: 'border-rose-200 bg-rose-50 text-rose-700',
        },
    };
}

/**
 * Renders one compact status chip summarizing current panel state.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelStatusBadge({
    label,
    tone,
    isDarkMode,
}: ControlPanelStatusBadgeProps & { readonly isDarkMode: boolean }) {
    const statusToneClassMap = createControlPanelStatusToneClassMap(isDarkMode);

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusToneClassMap[tone]}`}
        >
            {label}
        </span>
    );
}

/**
 * Renders the compact switch indicator used by tile toggles.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelToggleSwitch({
    isOn,
    tone,
    isDisabled = false,
    isDarkMode,
}: ControlPanelToggleSwitchProps & { readonly isDarkMode: boolean }) {
    const toneClasses = createControlPanelToggleToneClassMap(isDarkMode)[tone];

    return (
        <span
            className={`inline-flex h-5 w-9 items-center rounded-full border p-[1px] transition ${
                isOn
                    ? `${toneClasses.switchTrack} border-transparent`
                    : isDarkMode
                    ? 'border-slate-600 bg-slate-700'
                    : 'border-gray-300 bg-gray-200'
            } ${isDisabled ? 'opacity-70' : ''}`}
            aria-hidden="true"
        >
            <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isOn ? 'translate-x-4' : 'translate-x-0'
                }`}
            />
        </span>
    );
}

/**
 * Renders one visual toggle tile inspired by mobile control-center patterns.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelToggleTile({
    icon: Icon,
    label,
    description,
    stateLabel,
    isActive,
    onToggle,
    tone,
    isDisabled = false,
    auxiliaryDetail,
    columnSpan = 1,
    isDarkMode,
}: ControlPanelToggleTileProps & { readonly isDarkMode: boolean }) {
    const toneClasses = createControlPanelToggleToneClassMap(isDarkMode)[tone];

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isActive}
            disabled={isDisabled}
            className={`flex min-h-[8.4rem] flex-col rounded-2xl border p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                isActive
                    ? toneClasses.activeSurface
                    : isDarkMode
                    ? 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-[1px] hover:shadow-md'} ${
                columnSpan === 2 ? 'col-span-2' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive
                            ? toneClasses.iconWrap
                            : isDarkMode
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <ControlPanelToggleSwitch isOn={isActive} tone={tone} isDisabled={isDisabled} isDarkMode={isDarkMode} />
            </div>

            <div className="mt-2 min-w-0">
                <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-gray-900'}`}>
                    {label}
                </p>
                <p className={`mt-0.5 text-[11px] leading-snug ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    {description}
                </p>
                {auxiliaryDetail && (
                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {auxiliaryDetail}
                    </p>
                )}
            </div>

            <div className="mt-auto pt-2">
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                        isActive
                            ? toneClasses.stateBadge
                            : isDarkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-300'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}
                >
                    {stateLabel}
                </span>
            </div>
        </button>
    );
}

/**
 * Renders one shared card surface used by the select and Enter-key sections.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelSectionCard({
    icon: Icon,
    title,
    subtitle,
    children,
    isDarkMode,
}: ControlPanelSectionCardProps & { readonly isDarkMode: boolean }) {
    return (
        <section
            className={`rounded-2xl border p-3 shadow-sm ${
                isDarkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-50' : 'text-gray-900'}`}>
                        {title}
                    </p>
                    <p className={`mt-0.5 text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                        {subtitle}
                    </p>
                </div>
                <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'
                    }`}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>

            {children}
        </section>
    );
}

/**
 * Renders one select-based control-panel section with consistent layout.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelSelectSection({
    icon,
    section,
    isDarkMode,
}: ControlPanelSelectSectionProps & { readonly isDarkMode: boolean }) {
    return (
        <ControlPanelSectionCard icon={icon} title={section.title} subtitle={section.subtitle} isDarkMode={isDarkMode}>
            <div className="mt-2.5 space-y-1.5">
                <label
                    htmlFor={section.selectId}
                    className={`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}
                >
                    {section.selectLabel}
                </label>
                <select
                    id={section.selectId}
                    value={section.value}
                    onChange={(event) => section.onChange(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                        isDarkMode
                            ? 'border-slate-700 bg-slate-950 text-slate-100'
                            : 'border-gray-200 bg-white text-gray-800'
                    }`}
                >
                    {section.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{section.helpText}</p>
            </div>
        </ControlPanelSectionCard>
    );
}

/**
 * Renders the compact control-center content used by desktop and mobile wrappers.
 *
 * @private function of HeaderControlPanelDropdown
 */
export function ControlPanelContent({ title, subtitle, isMobile = false }: ControlPanelContentProps) {
    const { resolvedAppearance } = useAppearance();
    const controlPanelState = useControlPanelContentState({ title, subtitle });
    const isDarkMode = resolvedAppearance === 'dark';

    return (
        <div className={`space-y-2 ${isMobile ? 'pt-0.5' : ''}`}>
            <div
                className={`rounded-2xl border p-2.5 shadow-sm ${
                    isDarkMode
                        ? 'border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950/70'
                        : 'border-slate-200 bg-gradient-to-br from-slate-100/90 via-white to-blue-50'
                }`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>
                            {controlPanelState.feedbackTitle}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                            {controlPanelState.feedbackSubtitle}
                        </p>
                    </div>
                    <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                            isDarkMode ? 'bg-slate-800/95 text-sky-200' : 'bg-white/95 text-blue-600'
                        }`}
                    >
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                </div>

                {controlPanelState.summaryBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {controlPanelState.summaryBadges.map(({ key, tone, label }) => (
                            <ControlPanelStatusBadge key={key} tone={tone} label={label} isDarkMode={isDarkMode} />
                        ))}
                    </div>
                )}
            </div>

            {controlPanelState.toggleTiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {controlPanelState.toggleTiles.map(({ key, ...tileProps }) => (
                        <ControlPanelToggleTile key={key} {...tileProps} isDarkMode={isDarkMode} />
                    ))}
                </div>
            )}

            {controlPanelState.appearanceSection && (
                <ControlPanelSelectSection
                    icon={MoonStar}
                    section={controlPanelState.appearanceSection}
                    isDarkMode={isDarkMode}
                />
            )}

            {controlPanelState.languageSection && (
                <ControlPanelSelectSection
                    icon={Languages}
                    section={controlPanelState.languageSection}
                    isDarkMode={isDarkMode}
                />
            )}

            {controlPanelState.chatVisualModeSection && (
                <ControlPanelSelectSection
                    icon={MessageSquare}
                    section={controlPanelState.chatVisualModeSection}
                    isDarkMode={isDarkMode}
                />
            )}

            <ControlPanelSectionCard
                icon={CornerDownLeft}
                title={controlPanelState.chatEnterBehaviorSection.title}
                subtitle={controlPanelState.chatEnterBehaviorSection.subtitle}
                isDarkMode={isDarkMode}
            >
                <div className="mt-2.5">
                    <ChatEnterBehaviorSettingsPanel
                        storedEnterBehavior={controlPanelState.chatEnterBehaviorSection.storedEnterBehavior}
                        isLoading={controlPanelState.chatEnterBehaviorSection.isLoading}
                        isPersisting={controlPanelState.chatEnterBehaviorSection.isPersisting}
                        onSelectBehavior={controlPanelState.chatEnterBehaviorSection.onSelectBehavior}
                    />
                </div>
            </ControlPanelSectionCard>

            {controlPanelState.isAudioLoadingHintVisible && (
                <p className={`px-1 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {controlPanelState.audioLoadingLabel}
                </p>
            )}
        </div>
    );
}
