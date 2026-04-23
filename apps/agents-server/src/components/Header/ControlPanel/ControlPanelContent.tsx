'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
    ControlPanelSelectTileState,
    ControlPanelStatusTone,
    ControlPanelToggleTileState,
} from './ControlPanelContentState';
import { useControlPanelContentState } from './useControlPanelContentState';

/**
 * Shared props used by every control panel presentation.
 *
 * @private function of HeaderControlPanelDropdown
 */
type ControlPanelContentProps = {
    readonly isMobile?: boolean;
};

/**
 * Tone-specific styles used by compact control-panel tiles.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelTileToneClasses = {
    readonly activeSurface: string;
    readonly iconWrap: string;
    readonly switchTrack: string;
    readonly stateBadge: string;
};

/**
 * Props for one reusable control-panel tile surface.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelTileSurfaceProps = {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
    readonly tone: ControlPanelStatusTone;
    readonly isEmphasized?: boolean;
    readonly isDisabled?: boolean;
    readonly className?: string;
    readonly headerAccessory?: ReactNode;
    readonly children?: ReactNode;
    readonly footer?: ReactNode;
};

/**
 * Props for the compact state badge shown inside control-panel tiles.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelStateBadgeProps = {
    readonly label: string;
    readonly tone: ControlPanelStatusTone;
    readonly isEmphasized?: boolean;
};

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
 * Props for one compact toggle tile rendered inside the control-panel grid.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelToggleTileProps = Omit<ControlPanelToggleTileState, 'key' | 'kind'>;

/**
 * Props for one select-based tile rendered inside the control-panel grid.
 *
 * @private function of ControlPanelContent
 */
type ControlPanelSelectTileProps = Omit<ControlPanelSelectTileState, 'key' | 'kind'>;

/**
 * Lookup map of all tone-specific class groups for control-panel tiles.
 *
 * @private function of ControlPanelContent
 */
const CONTROL_PANEL_TILE_TONE_CLASS_MAP: Record<ControlPanelStatusTone, ControlPanelTileToneClasses> = {
    neutral: {
        activeSurface:
            'border-slate-300 bg-gradient-to-br from-slate-100 to-white text-slate-700 dark:border-slate-600 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100',
        iconWrap: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
        switchTrack: 'bg-slate-500 dark:bg-slate-300',
        stateBadge: 'border-slate-300 bg-white/85 text-slate-700 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100',
    },
    informative: {
        activeSurface:
            'border-blue-200 bg-gradient-to-br from-blue-100 via-white to-blue-50 text-blue-800 dark:border-blue-500/40 dark:from-slate-900 dark:via-blue-950/80 dark:to-slate-900 dark:text-blue-100',
        iconWrap: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
        switchTrack: 'bg-blue-500',
        stateBadge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100',
    },
    positive: {
        activeSurface:
            'border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:from-slate-900 dark:via-emerald-950/80 dark:to-slate-900 dark:text-emerald-100',
        iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
        switchTrack: 'bg-emerald-500',
        stateBadge:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100',
    },
    danger: {
        activeSurface:
            'border-rose-200 bg-gradient-to-br from-rose-100 via-white to-rose-50 text-rose-800 dark:border-rose-500/40 dark:from-slate-900 dark:via-rose-950/80 dark:to-slate-900 dark:text-rose-100',
        iconWrap: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100',
        switchTrack: 'bg-rose-500',
        stateBadge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100',
    },
};

/**
 * Renders the shared card surface reused by toggle and select tiles.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelTileSurface({
    icon: Icon,
    title,
    description,
    tone,
    isEmphasized = false,
    isDisabled = false,
    className,
    headerAccessory,
    children,
    footer,
}: ControlPanelTileSurfaceProps) {
    const toneClasses = CONTROL_PANEL_TILE_TONE_CLASS_MAP[tone];

    return (
        <div
            className={`flex min-h-[8.8rem] flex-col rounded-2xl border p-3 shadow-sm ${
                isEmphasized
                    ? toneClasses.activeSurface
                    : 'border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200'
            } ${isDisabled ? 'opacity-60' : ''} ${className || ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isEmphasized ? toneClasses.iconWrap : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                {headerAccessory}
            </div>

            <div className="mt-2 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-50">{title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-600 dark:text-slate-300">{description}</p>
            </div>

            {children && <div className="mt-3">{children}</div>}

            {footer && <div className="mt-auto pt-2">{footer}</div>}
        </div>
    );
}

/**
 * Renders a compact state badge matching the current tile tone.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelStateBadge({ label, tone, isEmphasized = true }: ControlPanelStateBadgeProps) {
    const toneClasses = CONTROL_PANEL_TILE_TONE_CLASS_MAP[tone];

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                isEmphasized
                    ? toneClasses.stateBadge
                    : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300'
            }`}
        >
            {label}
        </span>
    );
}

/**
 * Renders the compact switch indicator used by toggle tiles.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelToggleSwitch({ isOn, tone, isDisabled = false }: ControlPanelToggleSwitchProps) {
    const toneClasses = CONTROL_PANEL_TILE_TONE_CLASS_MAP[tone];

    return (
        <span
            className={`inline-flex h-5 w-9 items-center rounded-full border p-[1px] transition ${
                isOn
                    ? `${toneClasses.switchTrack} border-transparent`
                    : 'border-gray-300 bg-gray-200 dark:border-slate-600 dark:bg-slate-700'
            } ${isDisabled ? 'opacity-70' : ''}`}
            aria-hidden="true"
        >
            <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-slate-100 ${
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
    icon,
    title,
    description,
    stateLabel,
    isActive,
    onToggle,
    tone,
    isDisabled = false,
    auxiliaryDetail,
    columnSpan = 1,
}: ControlPanelToggleTileProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isActive}
            disabled={isDisabled}
            className={`group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                columnSpan === 2 ? 'col-span-2' : ''
            } ${isDisabled ? 'cursor-not-allowed' : ''}`}
        >
            <ControlPanelTileSurface
                icon={icon}
                title={title}
                description={description}
                tone={tone}
                isEmphasized={isActive}
                isDisabled={isDisabled}
                className={`transition ${
                    isDisabled
                        ? ''
                        : isActive
                          ? 'group-hover:-translate-y-[1px] group-hover:shadow-md'
                          : 'group-hover:-translate-y-[1px] group-hover:border-gray-300 group-hover:bg-gray-50 group-hover:shadow-md dark:group-hover:border-slate-600 dark:group-hover:bg-slate-900'
                }`}
                headerAccessory={<ControlPanelToggleSwitch isOn={isActive} tone={tone} isDisabled={isDisabled} />}
                footer={<ControlPanelStateBadge label={stateLabel} tone={tone} isEmphasized={isActive} />}
            >
                {auxiliaryDetail && <p className="text-[10px] leading-snug text-gray-500 dark:text-slate-400">{auxiliaryDetail}</p>}
            </ControlPanelTileSurface>
        </button>
    );
}

/**
 * Renders one select-based tile aligned with the toggle tile styling.
 *
 * @private function of ControlPanelContent
 */
function ControlPanelSelectTile({
    icon,
    title,
    description,
    tone,
    stateLabel,
    selectId,
    selectLabel,
    value,
    options,
    helpText,
    onChange,
    isDisabled = false,
    columnSpan = 1,
}: ControlPanelSelectTileProps) {
    return (
        <section className={columnSpan === 2 ? 'col-span-2' : ''}>
            <ControlPanelTileSurface
                icon={icon}
                title={title}
                description={description}
                tone={tone}
                isEmphasized
                isDisabled={isDisabled}
                className={`transition ${isDisabled ? '' : 'hover:-translate-y-[1px] hover:shadow-md'}`}
                headerAccessory={<ControlPanelStateBadge label={stateLabel} tone={tone} />}
            >
                <div className="space-y-1.5">
                    <label htmlFor={selectId} className="sr-only">
                        {selectLabel}
                    </label>
                    <select
                        id={selectId}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        disabled={isDisabled}
                        className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] leading-snug text-gray-500 dark:text-slate-400">{helpText}</p>
                </div>
            </ControlPanelTileSurface>
        </section>
    );
}

/**
 * Renders the compact control-panel content used by desktop and mobile wrappers.
 *
 * @private function of HeaderControlPanelDropdown
 */
export function ControlPanelContent({ isMobile = false }: ControlPanelContentProps) {
    const controlPanelState = useControlPanelContentState();

    return (
        <div className={`space-y-2 ${isMobile ? 'pt-0.5' : ''}`}>
            {controlPanelState.tiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {controlPanelState.tiles.map((tile) => {
                        if (tile.kind === 'toggle') {
                            return (
                                <ControlPanelToggleTile
                                    key={tile.key}
                                    icon={tile.icon}
                                    title={tile.title}
                                    description={tile.description}
                                    stateLabel={tile.stateLabel}
                                    isActive={tile.isActive}
                                    onToggle={tile.onToggle}
                                    tone={tile.tone}
                                    isDisabled={tile.isDisabled}
                                    auxiliaryDetail={tile.auxiliaryDetail}
                                    columnSpan={tile.columnSpan}
                                />
                            );
                        }

                        return (
                            <ControlPanelSelectTile
                                key={tile.key}
                                icon={tile.icon}
                                title={tile.title}
                                description={tile.description}
                                tone={tile.tone}
                                stateLabel={tile.stateLabel}
                                selectId={tile.selectId}
                                selectLabel={tile.selectLabel}
                                value={tile.value}
                                options={tile.options}
                                helpText={tile.helpText}
                                onChange={tile.onChange}
                                isDisabled={tile.isDisabled}
                                columnSpan={tile.columnSpan}
                            />
                        );
                    })}
                </div>
            )}

            {controlPanelState.isAudioLoadingHintVisible && (
                <p className="px-1 text-[11px] text-gray-500 dark:text-slate-400">{controlPanelState.audioLoadingLabel}</p>
            )}
        </div>
    );
}
