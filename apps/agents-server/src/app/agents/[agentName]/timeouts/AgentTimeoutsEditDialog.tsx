import { Dialog } from '@/src/components/Portal/Dialog';
import type { useAgentTimeoutsClientState } from './useAgentTimeoutsClientState';

/**
 * Props for the timeout edit dialog.
 *
 * @private function of AgentTimeoutsClient
 */
type AgentTimeoutsEditDialogProps = {
    state: ReturnType<typeof useAgentTimeoutsClientState>;
};

/**
 * Renders the advanced timeout edit dialog.
 *
 * @private function of AgentTimeoutsClient
 */
export function AgentTimeoutsEditDialog({ state }: AgentTimeoutsEditDialogProps) {
    const editingTimeout = state.editingTimeout;

    if (!editingTimeout) {
        return null;
    }

    const isSaving = state.busyTimeoutId === editingTimeout.timeoutId && state.busyAction === 'save';

    return (
        <Dialog onClose={state.closeEditDialog} isBackdropDismissible={false} className="w-full max-w-2xl p-5 sm:p-6">
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Edit timeout</h2>
                    <p className="text-sm text-slate-500">{editingTimeout.timeoutId}</p>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Next run</span>
                    <input
                        type="datetime-local"
                        value={state.editDraft.dueAtLocalValue}
                        onChange={(event) => state.updateEditDueAtLocalValue(event.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Recurrence (minutes, leave empty for one-shot)</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={state.editDraft.recurrenceMinutesValue}
                        onChange={(event) => state.updateEditRecurrenceMinutesValue(event.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Wake-up message</span>
                    <input
                        type="text"
                        value={state.editDraft.messageValue}
                        onChange={(event) => state.updateEditMessageValue(event.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-slate-700">Payload parameters (JSON object)</span>
                    <textarea
                        value={state.editDraft.parametersValue}
                        onChange={(event) => state.updateEditParametersValue(event.target.value)}
                        className="min-h-40 rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                    />
                </label>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={state.closeEditDialog}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void state.saveEdits();
                        }}
                        disabled={isSaving}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
