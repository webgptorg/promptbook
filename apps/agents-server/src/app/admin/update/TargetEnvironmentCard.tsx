'use client';

import { Download, Loader2, Rocket, TriangleAlert } from 'lucide-react';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { AdvancedOriginRepositoryPanel } from './AdvancedOriginRepositoryPanel';
import { CustomCommitPicker } from './CustomCommitPicker';
import type { UpdateEnvironmentOption } from './UpdateOverview';
import type { UpdateClientState } from './useUpdateClientState';

/**
 * Props for the target environment card.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type TargetEnvironmentCardProps = {
    readonly state: UpdateClientState;
    readonly language: ServerLanguageCode;
};

/**
 * Props for the environment option list.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type EnvironmentOptionListProps = {
    readonly environments: ReadonlyArray<UpdateEnvironmentOption>;
    readonly currentEnvironmentId: string | null;
    readonly selectedEnvironmentId: string | null;
    readonly isDisabled: boolean;
    readonly onSelectEnvironment: (environmentId: string) => void;
};

/**
 * Props for one environment option button.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type EnvironmentOptionButtonProps = {
    readonly environment: UpdateEnvironmentOption;
    readonly isSelected: boolean;
    readonly isCurrent: boolean;
    readonly isDisabled: boolean;
    readonly onSelectEnvironment: (environmentId: string) => void;
};

/**
 * Props for the custom ref selection panel.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type CustomRefPanelProps = {
    readonly state: UpdateClientState;
    readonly language: ServerLanguageCode;
    readonly isControlsDisabled: boolean;
};

/**
 * Props for the primary update start button.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type UpdateStartButtonProps = {
    readonly state: UpdateClientState;
};

/**
 * Visual mode used by the primary update start button icon.
 *
 * @private type of `<TargetEnvironmentCard/>`
 */
type UpdateStartButtonMode = 'loading' | 'rocket' | 'download';

/**
 * Target environment picker and update trigger controls.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function TargetEnvironmentCard({ state, language }: TargetEnvironmentCardProps) {
    const isControlsDisabled = state.isUpdateRunning || state.isStartingUpdate;

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Target environment</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Selecting another environment automatically updates the server to the latest commit on that branch.
                </p>
            </div>

            <EnvironmentOptionList
                environments={state.overview?.environments ?? []}
                currentEnvironmentId={state.overview?.currentEnvironment.id ?? null}
                selectedEnvironmentId={state.selectedEnvironment?.id ?? null}
                isDisabled={isControlsDisabled}
                onSelectEnvironment={state.selectEnvironment}
            />

            <CustomRefPanel state={state} language={language} isControlsDisabled={isControlsDisabled} />

            <AdvancedOriginRepositoryPanel
                originRepositoryUrlOverride={state.originRepositoryUrlOverride}
                onChange={state.changeOriginRepositoryUrlOverride}
                overview={state.overview}
                isExpanded={state.isAdvancedExpanded}
                onToggleExpanded={state.toggleAdvanced}
                isDisabled={isControlsDisabled}
            />

            <UpdateStartButton state={state} />
        </div>
    );
}

/**
 * Renders all update environment choices.
 *
 * @private internal component of `<TargetEnvironmentCard/>`
 */
function EnvironmentOptionList({
    environments,
    currentEnvironmentId,
    selectedEnvironmentId,
    isDisabled,
    onSelectEnvironment,
}: EnvironmentOptionListProps) {
    return (
        <div className="grid gap-3">
            {environments.map((environment) => (
                <EnvironmentOptionButton
                    key={environment.id}
                    environment={environment}
                    isSelected={environment.id === selectedEnvironmentId}
                    isCurrent={environment.id === currentEnvironmentId}
                    isDisabled={isDisabled}
                    onSelectEnvironment={onSelectEnvironment}
                />
            ))}
        </div>
    );
}

/**
 * Renders one selectable update environment.
 *
 * @private internal component of `<TargetEnvironmentCard/>`
 */
function EnvironmentOptionButton({
    environment,
    isSelected,
    isCurrent,
    isDisabled,
    onSelectEnvironment,
}: EnvironmentOptionButtonProps) {
    return (
        <button
            type="button"
            onClick={() => onSelectEnvironment(environment.id)}
            disabled={isDisabled}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
                isSelected
                    ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
            } disabled:cursor-not-allowed disabled:opacity-60`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{environment.label}</div>
                {isCurrent && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        Current
                    </span>
                )}
            </div>
            {environment.branch && <div className="mt-1 font-mono text-xs">{environment.branch}</div>}
            <div className="mt-2 text-sm opacity-80">{environment.description}</div>
        </button>
    );
}

/**
 * Shows the custom commit/tag/branch picker for the custom target environment.
 *
 * @private internal component of `<TargetEnvironmentCard/>`
 */
function CustomRefPanel({ state, language, isControlsDisabled }: CustomRefPanelProps) {
    if (!state.isCustomEnvironmentSelected) {
        return null;
    }

    if (!state.overview?.isAvailable) {
        return null;
    }

    return (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <CustomCommitPicker
                language={language}
                selectedRef={state.customRef}
                onSelectRef={state.selectCustomRef}
                isDisabled={isControlsDisabled}
            />

            {state.customRef.trim() && !state.isCustomRefRelease && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <strong>Heads up:</strong> the selected ref is not a release tag, so it may be unstable and was
                        not validated by the regular release pipeline.
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Primary button for starting an update using the selected target.
 *
 * @private internal component of `<TargetEnvironmentCard/>`
 */
function UpdateStartButton({ state }: UpdateStartButtonProps) {
    const buttonMode = getUpdateStartButtonMode(state);

    return (
        <button
            type="button"
            onClick={() => void state.startUpdate()}
            disabled={isUpdateStartDisabled(state)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <UpdateStartButtonIcon buttonMode={buttonMode} />
            {getUpdateStartButtonLabel(state)}
        </button>
    );
}

/**
 * Renders the icon for the update start button.
 *
 * @private internal component of `<TargetEnvironmentCard/>`
 */
function UpdateStartButtonIcon({ buttonMode }: { readonly buttonMode: UpdateStartButtonMode }) {
    if (buttonMode === 'loading') {
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (buttonMode === 'rocket') {
        return <Rocket className="h-4 w-4" />;
    }

    return <Download className="h-4 w-4" />;
}

/**
 * Resolves whether the primary update button should be disabled.
 *
 * @param state - Current update client state.
 * @returns `true` when the update cannot be started from the current selection.
 *
 * @private function of `<TargetEnvironmentCard/>`
 */
function isUpdateStartDisabled(state: UpdateClientState): boolean {
    if (!state.overview?.isAvailable) {
        return true;
    }

    if (!state.selectedEnvironment) {
        return true;
    }

    if (state.isUpdateRunning || state.isStartingUpdate) {
        return true;
    }

    if (state.isCustomRefMissing) {
        return true;
    }

    if (state.isCustomEnvironmentSelected) {
        return false;
    }

    if (state.isEnvironmentSwitchRequired) {
        return false;
    }

    if (state.overview.isUpdateAvailable) {
        return false;
    }

    return !state.isOriginRepositoryUrlOverrideChanged;
}

/**
 * Resolves which icon should be shown by the update start button.
 *
 * @param state - Current update client state.
 * @returns Button icon mode.
 *
 * @private function of `<TargetEnvironmentCard/>`
 */
function getUpdateStartButtonMode(state: UpdateClientState): UpdateStartButtonMode {
    if (state.isStartingUpdate || state.isUpdateRunning) {
        return 'loading';
    }

    if (state.isCustomEnvironmentSelected || state.isEnvironmentSwitchRequired) {
        return 'rocket';
    }

    return 'download';
}

/**
 * Builds the primary update button label from the current target selection.
 *
 * @param state - Current update client state.
 * @returns Human-readable button label.
 *
 * @private function of `<TargetEnvironmentCard/>`
 */
function getUpdateStartButtonLabel(state: UpdateClientState): string {
    if (state.isCustomEnvironmentSelected) {
        return `Update to ${state.customRef.trim() || 'custom ref'}`;
    }

    if (state.isEnvironmentSwitchRequired) {
        return `Switch to ${state.selectedEnvironment?.label || 'selected environment'} and update`;
    }

    return 'Update to latest commit';
}
