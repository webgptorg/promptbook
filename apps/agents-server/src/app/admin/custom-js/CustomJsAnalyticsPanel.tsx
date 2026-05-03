import type { AnalyticsSettings } from '../../../constants/analyticsMetadata';
import {
    CUSTOM_RESOURCE_INPUT_CLASS_NAME,
    CUSTOM_RESOURCE_PRIMARY_BUTTON_CLASS_NAME,
    CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME,
} from '../custom-resource/shared';

/**
 * Props consumed by `CustomJsAnalyticsPanel`.
 *
 * @private function of CustomJsClient
 */
type CustomJsAnalyticsPanelProps = {
    readonly analyticsHasChanges: boolean;
    readonly analyticsLoadError: string | null;
    readonly analyticsSettings: AnalyticsSettings;
    readonly analyticsStatus: { type: 'success' | 'error'; text: string } | null;
    readonly isAnalyticsLoading: boolean;
    readonly isAnalyticsSaving: boolean;
    readonly onLoadAnalyticsSettings: () => void | Promise<void>;
    readonly onSaveAnalyticsSettings: () => void | Promise<void>;
    readonly onUpdateAnalyticsSettings: (updates: Partial<AnalyticsSettings>) => void;
};

/**
 * Renders the built-in analytics settings section.
 *
 * @private function of CustomJsClient
 */
export function CustomJsAnalyticsPanel({
    analyticsHasChanges,
    analyticsLoadError,
    analyticsSettings,
    analyticsStatus,
    isAnalyticsLoading,
    isAnalyticsSaving,
    onLoadAnalyticsSettings,
    onSaveAnalyticsSettings,
    onUpdateAnalyticsSettings,
}: CustomJsAnalyticsPanelProps) {
    return (
        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Analytics integrations</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                        Configure built-in Google Analytics and Smartsapp snippets without writing raw code.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void onLoadAnalyticsSettings()}
                        disabled={isAnalyticsLoading || isAnalyticsSaving}
                        className={CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME}
                    >
                        Reload settings
                    </button>
                    <button
                        type="button"
                        onClick={() => void onSaveAnalyticsSettings()}
                        disabled={isAnalyticsLoading || isAnalyticsSaving || !analyticsHasChanges}
                        className={CUSTOM_RESOURCE_PRIMARY_BUTTON_CLASS_NAME}
                    >
                        {isAnalyticsSaving ? 'Saving...' : 'Save analytics settings'}
                    </button>
                </div>
            </div>

            {analyticsLoadError && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                    {analyticsLoadError}
                    <button
                        type="button"
                        onClick={() => void onLoadAnalyticsSettings()}
                        className="ml-3 text-blue-600 underline dark:text-blue-300"
                    >
                        Retry
                    </button>
                </div>
            )}
            {analyticsStatus && (
                <div
                    className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                        analyticsStatus.type === 'error'
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : 'border-green-300 bg-green-50 text-green-800'
                    } ${
                        analyticsStatus.type === 'error'
                            ? 'dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                            : 'dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300'
                    }`}
                >
                    {analyticsStatus.text}
                </div>
            )}

            {isAnalyticsLoading ? (
                <div className="rounded border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    Loading analytics settings...
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Google Analytics (gtag.js)</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Inject gtag.js with your measurement ID and basic flags.
                            </p>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="analytics-google-id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                                    Measurement ID
                                </label>
                                <input
                                    id="analytics-google-id"
                                    type="text"
                                    value={analyticsSettings.googleMeasurementId}
                                    onChange={(event) =>
                                        onUpdateAnalyticsSettings({
                                            googleMeasurementId: event.target.value,
                                        })
                                    }
                                    className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} text-sm`}
                                    placeholder="G-XXXXXXXXXX"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Leave empty to keep Google Analytics disabled.</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={analyticsSettings.googleAutoPageView}
                                        onChange={(event) =>
                                            onUpdateAnalyticsSettings({
                                                googleAutoPageView: event.target.checked,
                                            })
                                        }
                                    />
                                    <span>Record page views automatically</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={analyticsSettings.googleAnonymizeIp}
                                        onChange={(event) =>
                                            onUpdateAnalyticsSettings({
                                                googleAnonymizeIp: event.target.checked,
                                            })
                                        }
                                    />
                                    <span>Anonymize visitor IPs</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={analyticsSettings.googleAdPersonalization}
                                        onChange={(event) =>
                                            onUpdateAnalyticsSettings({
                                                googleAdPersonalization: event.target.checked,
                                            })
                                        }
                                    />
                                    <span>Allow ad personalization signals</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Smartsapp</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Load the Smartsapp SDK with your workspace and basic tracking settings.
                            </p>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label
                                    htmlFor="analytics-smartsapp-workspace"
                                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300"
                                >
                                    Workspace ID
                                </label>
                                <input
                                    id="analytics-smartsapp-workspace"
                                    type="text"
                                    value={analyticsSettings.smartsappWorkspaceId}
                                    onChange={(event) =>
                                        onUpdateAnalyticsSettings({
                                            smartsappWorkspaceId: event.target.value,
                                        })
                                    }
                                    className={`${CUSTOM_RESOURCE_INPUT_CLASS_NAME} text-sm`}
                                    placeholder="workspace-id"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    Leave blank to disable the Smartsapp loader.
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={analyticsSettings.smartsappAutoPageView}
                                        onChange={(event) =>
                                            onUpdateAnalyticsSettings({
                                                smartsappAutoPageView: event.target.checked,
                                            })
                                        }
                                    />
                                    <span>Track page views automatically</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={analyticsSettings.smartsappCaptureErrors}
                                        onChange={(event) =>
                                            onUpdateAnalyticsSettings({
                                                smartsappCaptureErrors: event.target.checked,
                                            })
                                        }
                                    />
                                    <span>Capture front-end errors</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
