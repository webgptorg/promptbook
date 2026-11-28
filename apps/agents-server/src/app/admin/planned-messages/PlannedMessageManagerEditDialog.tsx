'use client';

import { Dialog } from '@/src/components/Portal/Dialog';
import type { PlannedMessageRecurrenceKind } from '@/src/utils/plannedMessageManager/resolvePlannedMessageRecurrenceKind';
import type { PlannedMessageManagerRecord } from '@/src/utils/plannedMessagesAdmin';
import { X } from 'lucide-react';
import { useState } from 'react';
import {
    createPlannedMessageEditForm,
    type PlannedMessageEditForm,
    type PlannedMessageIntervalUnit,
} from './plannedMessageEditForm';

/**
 * Frequency choices offered by the editor, with what each of them needs.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
const PLANNED_MESSAGE_RECURRENCE_CHOICES: ReadonlyArray<{
    readonly id: PlannedMessageRecurrenceKind;
    readonly label: string;
    readonly description: string;
}> = [
    { id: 'INTERVAL', label: 'Every', description: 'Repeats at a fixed interval' },
    { id: 'CRON', label: 'On a cron', description: 'Repeats on a five-field cron expression' },
    { id: 'ONCE', label: 'Once', description: 'Wakes the agent a single time, at the starting date' },
];

/**
 * Interval units offered by the editor.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
const PLANNED_MESSAGE_INTERVAL_UNITS: ReadonlyArray<PlannedMessageIntervalUnit> = ['minutes', 'hours', 'days'];

/**
 * Shared classes of the editor text inputs.
 *
 * @private function of PlannedMessageManagerEditDialog
 */
const PLANNED_MESSAGE_EDITOR_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Props for the planned-message editor.
 *
 * @private function of PlannedMessageManagerClient
 */
type PlannedMessageManagerEditDialogProps = {
    readonly plannedMessage: PlannedMessageManagerRecord;
    readonly isSaving: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (form: PlannedMessageEditForm) => Promise<boolean>;
};

/**
 * Dialog changing the whole plan of one planned message.
 *
 * The form always describes the complete plan, so emptying a bound really removes it. What the plan is
 * allowed to be is decided by the server, which holds an administrator to the very same rules an agent
 * planning for itself is held to.
 *
 * @private function of PlannedMessageManagerClient
 */
export function PlannedMessageManagerEditDialog({
    plannedMessage,
    isSaving,
    onClose,
    onSubmit,
}: PlannedMessageManagerEditDialogProps) {
    const [form, setForm] = useState<PlannedMessageEditForm>(() => createPlannedMessageEditForm(plannedMessage));

    /**
     * Applies one field change to the edited plan.
     */
    function updateForm(change: Partial<PlannedMessageEditForm>): void {
        setForm((currentForm) => ({ ...currentForm, ...change }));
    }

    return (
        <Dialog onClose={onClose} className="w-[min(44rem,92vw)] p-6" ariaLabel="Edit planned message">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Edit planned message</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Of {plannedMessage.agentName || plannedMessage.agentPermanentId}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Close"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <form
                className="mt-4 flex flex-col gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void onSubmit(form);
                }}
            >
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-700">Message</span>
                    <textarea
                        value={form.message}
                        rows={3}
                        onChange={(event) => updateForm({ message: event.target.value })}
                        className={PLANNED_MESSAGE_EDITOR_INPUT_CLASS_NAME}
                        placeholder="What the agent is woken up to do"
                    />
                </label>

                <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-medium text-gray-700">Frequency</legend>
                    {PLANNED_MESSAGE_RECURRENCE_CHOICES.map((choice) => (
                        <label key={choice.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                            <input
                                type="radio"
                                name="planned-message-recurrence-kind"
                                checked={form.recurrenceKind === choice.id}
                                onChange={() => updateForm({ recurrenceKind: choice.id })}
                            />
                            <span className="font-medium">{choice.label}</span>

                            {choice.id === 'INTERVAL' && (
                                <>
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.intervalValue}
                                        onChange={(event) => updateForm({ intervalValue: event.target.value })}
                                        disabled={form.recurrenceKind !== 'INTERVAL'}
                                        className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                                    />
                                    <select
                                        value={form.intervalUnit}
                                        onChange={(event) =>
                                            updateForm({
                                                intervalUnit: event.target.value as PlannedMessageIntervalUnit,
                                            })
                                        }
                                        disabled={form.recurrenceKind !== 'INTERVAL'}
                                        className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
                                    >
                                        {PLANNED_MESSAGE_INTERVAL_UNITS.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {choice.id === 'CRON' && (
                                <input
                                    type="text"
                                    value={form.cronExpression}
                                    onChange={(event) => updateForm({ cronExpression: event.target.value })}
                                    disabled={form.recurrenceKind !== 'CRON'}
                                    placeholder="0 9 * * 1-5"
                                    className="w-44 rounded-md border border-gray-300 px-2 py-1 font-mono text-sm disabled:bg-gray-100"
                                />
                            )}

                            <span className="text-xs text-gray-500">{choice.description}</span>
                        </label>
                    ))}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Starts at</span>
                        <input
                            type="datetime-local"
                            value={form.startsAtLocal}
                            onChange={(event) => updateForm({ startsAtLocal: event.target.value })}
                            className={PLANNED_MESSAGE_EDITOR_INPUT_CLASS_NAME}
                        />
                        <span className="text-xs text-gray-500">Empty means it may wake the agent right away.</span>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Ends at</span>
                        <input
                            type="datetime-local"
                            value={form.endsAtLocal}
                            onChange={(event) => updateForm({ endsAtLocal: event.target.value })}
                            className={PLANNED_MESSAGE_EDITOR_INPUT_CLASS_NAME}
                        />
                        <span className="text-xs text-gray-500">Empty means it has no ending date.</span>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Total runs</span>
                        <input
                            type="number"
                            min={1}
                            value={form.maxRunCount}
                            onChange={(event) => updateForm({ maxRunCount: event.target.value })}
                            className={PLANNED_MESSAGE_EDITOR_INPUT_CLASS_NAME}
                        />
                        <span className="text-xs text-gray-500">
                            Empty means it repeats until cancelled. Already done: {plannedMessage.runCount}.
                        </span>
                    </label>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Close
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Saving…' : 'Save plan'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
