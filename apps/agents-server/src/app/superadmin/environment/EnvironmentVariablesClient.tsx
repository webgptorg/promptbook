'use client';

import { EyeOff, Loader2, Plus, Save, ServerCog, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';
import { AdminSortableTableHeaderCell } from '../../admin/_components/AdminSortableTableHeaderCell';
import { useAdminTableSorting, type AdminTableSortOrder } from '../../admin/_components/adminTableSorting';

/**
 * One environment variable returned by the admin API.
 */
type EnvironmentVariableRecord = {
    readonly key: string;
    readonly value: string;
    readonly isSensitive: boolean;
    readonly isDefined: boolean;
};

/**
 * One environment variable that has been added in the browser but not yet saved.
 */
type NewEnvironmentVariable = {
    /**
     * Stable local identifier used as the React key.
     */
    readonly id: number;

    /**
     * Draft environment variable name.
     */
    readonly key: string;

    /**
     * Draft environment variable value.
     */
    readonly value: string;
};

/**
 * Validated environment-variable updates or the validation error to show in the browser.
 */
type EnvironmentVariableUpdatesResult =
    | {
          readonly updates: Record<string, string>;
      }
    | {
          readonly errorMessage: string;
      };

/**
 * Environment API response consumed by the client page.
 */
type EnvironmentVariablesResponse = {
    readonly envFilePath: string;
    readonly variables: ReadonlyArray<EnvironmentVariableRecord>;
    readonly canEdit: boolean;
    readonly error?: string;
    readonly applyResult?: {
        readonly isAvailable: boolean;
        readonly output: string;
    } | null;
};

/**
 * Sortable environment variable table columns.
 */
type EnvironmentVariableTableSortField = 'key' | 'value' | 'status';

/**
 * Shared input styling for environment rows.
 */
const INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

/**
 * Placeholder shown instead of sensitive environment values.
 */
const HIDDEN_ENVIRONMENT_VALUE = '********';

/**
 * Resolves the initial direction used when switching environment variable sort fields.
 */
function resolveEnvironmentVariableDefaultSortOrder(): AdminTableSortOrder {
    return 'asc';
}

/**
 * Browser UI for standalone VPS environment variables.
 */
export function EnvironmentVariablesClient() {
    const [envFilePath, setEnvFilePath] = useState('');
    const [variables, setVariables] = useState<EnvironmentVariableRecord[]>([]);
    const [draftValues, setDraftValues] = useState<Record<string, string>>({});
    const [newEnvironmentVariables, setNewEnvironmentVariables] = useState<NewEnvironmentVariable[]>([]);
    const nextNewEnvironmentVariableIdReference = useRef(1);
    const [canEdit, setCanEdit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [applyOutput, setApplyOutput] = useState<string | null>(null);

    const hasChanges = useMemo(
        () =>
            variables.some((variable) => draftValues[variable.key] !== variable.value) ||
            newEnvironmentVariables.some((variable) => variable.key.trim() !== '' || variable.value !== ''),
        [draftValues, newEnvironmentVariables, variables],
    );

    const resolveEnvironmentVariableSortValue = useCallback(
        (variable: EnvironmentVariableRecord, sortBy: EnvironmentVariableTableSortField) => {
            if (sortBy === 'value') {
                return draftValues[variable.key] ?? variable.value;
            }

            if (sortBy === 'status') {
                return variable.isDefined;
            }

            return variable.key;
        },
        [draftValues],
    );

    const variableSorting = useAdminTableSorting<EnvironmentVariableRecord, EnvironmentVariableTableSortField>({
        rows: variables,
        defaultSortBy: 'key',
        resolveDefaultSortOrder: resolveEnvironmentVariableDefaultSortOrder,
        resolveSortValue: resolveEnvironmentVariableSortValue,
    });

    useEffect(() => {
        void loadVariables();
    }, []);

    /**
     * Loads environment variables from the admin API.
     */
    async function loadVariables(): Promise<void> {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const response = await fetch('/api/admin/environment', { cache: 'no-store' });
            const payload = (await response.json()) as EnvironmentVariablesResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load environment variables.');
            }

            setEnvFilePath(payload.envFilePath);
            setVariables([...payload.variables]);
            setDraftValues(Object.fromEntries(payload.variables.map((variable) => [variable.key, variable.value])));
            setNewEnvironmentVariables([]);
            setCanEdit(payload.canEdit);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load environment variables.');
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Persists current environment drafts.
     *
     * @param applyRuntimeConfiguration - Whether to run the VPS apply step after saving.
     */
    async function saveVariables(applyRuntimeConfiguration: boolean): Promise<void> {
        const environmentVariableUpdatesResult = createEnvironmentVariableUpdates();
        if ('errorMessage' in environmentVariableUpdatesResult) {
            setErrorMessage(environmentVariableUpdatesResult.errorMessage);
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            setApplyOutput(null);

            const response = await fetch('/api/admin/environment', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    variables: environmentVariableUpdatesResult.updates,
                    applyRuntimeConfiguration,
                }),
            });
            const payload = (await response.json()) as EnvironmentVariablesResponse;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save environment variables.');
            }

            setEnvFilePath(payload.envFilePath);
            setVariables([...payload.variables]);
            setDraftValues(Object.fromEntries(payload.variables.map((variable) => [variable.key, variable.value])));
            setNewEnvironmentVariables([]);
            setCanEdit(payload.canEdit);
            setSuccessMessage('Environment variables were saved.');
            setApplyOutput(payload.applyResult?.output || null);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save environment variables.');
        } finally {
            setIsSaving(false);
        }
    }

    /**
     * Adds one unsaved arbitrary environment variable to the table.
     */
    function addNewEnvironmentVariable(): void {
        const id = nextNewEnvironmentVariableIdReference.current;
        nextNewEnvironmentVariableIdReference.current += 1;

        setNewEnvironmentVariables((currentVariables) => [
            ...currentVariables,
            {
                id,
                key: '',
                value: '',
            },
        ]);
    }

    /**
     * Removes one unsaved arbitrary environment variable from the table.
     *
     * @param id - Local identifier of the variable to remove.
     */
    function removeNewEnvironmentVariable(id: number): void {
        setNewEnvironmentVariables((currentVariables) => currentVariables.filter((variable) => variable.id !== id));
    }

    /**
     * Updates one field of an unsaved arbitrary environment variable.
     *
     * @param id - Local identifier of the variable to update.
     * @param field - Field that changed in the browser.
     * @param value - Next field value.
     */
    function updateNewEnvironmentVariable(id: number, field: 'key' | 'value', value: string): void {
        setNewEnvironmentVariables((currentVariables) =>
            currentVariables.map((variable) => (variable.id === id ? { ...variable, [field]: value } : variable)),
        );
    }

    /**
     * Combines saved-row drafts with new arbitrary environment variables.
     *
     * @returns Environment variable updates accepted by the admin API or a validation message.
     */
    function createEnvironmentVariableUpdates(): EnvironmentVariableUpdatesResult {
        const updates = { ...draftValues };

        for (const newEnvironmentVariable of newEnvironmentVariables) {
            const key = newEnvironmentVariable.key.trim();
            if (key === '' && newEnvironmentVariable.value === '') {
                continue;
            }

            if (key === '') {
                return { errorMessage: 'Enter a name for each new environment variable.' };
            }

            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                return { errorMessage: `Environment variable \`${key}\` is already listed.` };
            }

            updates[key] = newEnvironmentVariable.value;
        }

        return { updates };
    }

    return (
        <div className="space-y-6">
            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-2 text-sm text-slate-600">
                    <p>
                        These values are stored in the VPS-wide <span className="font-mono">.env</span> file and affect
                        the whole installed Agents Server process.
                    </p>
                    <p>
                        Sensitive values are always masked. To change a secret, type a new value; leaving the stars in
                        place keeps the current secret.
                    </p>
                    {envFilePath ? <p className="font-mono text-xs text-slate-500">{envFilePath}</p> : null}
                </div>
            </Card>

            {!canEdit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    You can view environment variables as an administrator. Editing is restricted to the super admin
                    authenticated with <span className="font-mono">ADMIN_PASSWORD</span>.
                </div>
            )}

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}
            {applyOutput && (
                <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                    {applyOutput}
                </pre>
            )}

            <Card className="hover:border-gray-200 hover:shadow-md">
                {canEdit && !isLoading && (
                    <div className="border-b border-gray-200 px-4 py-3">
                        <button
                            type="button"
                            onClick={addNewEnvironmentVariable}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            Add variable
                        </button>
                    </div>
                )}
                {isLoading ? (
                    <div className="py-10 text-center text-sm text-gray-500">Loading environment variables...</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                            <colgroup>
                                <col className="w-[18rem]" />
                                <col />
                                <col className="w-[10rem]" />
                            </colgroup>
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <AdminSortableTableHeaderCell
                                        className="px-4 py-3 text-left font-semibold"
                                        label="variable"
                                        sortBy="key"
                                        activeSortBy={variableSorting.sortBy}
                                        sortOrder={variableSorting.sortOrder}
                                        onSortChange={variableSorting.handleSortChange}
                                    >
                                        Variable
                                    </AdminSortableTableHeaderCell>
                                    <AdminSortableTableHeaderCell
                                        className="px-4 py-3 text-left font-semibold"
                                        label="value"
                                        sortBy="value"
                                        activeSortBy={variableSorting.sortBy}
                                        sortOrder={variableSorting.sortOrder}
                                        onSortChange={variableSorting.handleSortChange}
                                    >
                                        Value
                                    </AdminSortableTableHeaderCell>
                                    <AdminSortableTableHeaderCell
                                        className="px-4 py-3 text-left font-semibold"
                                        label="status"
                                        sortBy="status"
                                        activeSortBy={variableSorting.sortBy}
                                        sortOrder={variableSorting.sortOrder}
                                        onSortChange={variableSorting.handleSortChange}
                                    >
                                        Status
                                    </AdminSortableTableHeaderCell>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {newEnvironmentVariables.map((variable) => (
                                    <tr key={`new-environment-variable-${variable.id}`} className="bg-blue-50/40">
                                        <td className="px-4 py-3 align-top">
                                            <input
                                                type="text"
                                                value={variable.key}
                                                onChange={(event) =>
                                                    updateNewEnvironmentVariable(variable.id, 'key', event.target.value)
                                                }
                                                disabled={isSaving}
                                                className={INPUT_CLASS_NAME}
                                                placeholder="FOO"
                                                aria-label="New environment variable name"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    value={variable.value}
                                                    onChange={(event) =>
                                                        updateNewEnvironmentVariable(
                                                            variable.id,
                                                            'value',
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={isSaving}
                                                    className={`${INPUT_CLASS_NAME} pr-10 tracking-wider`}
                                                    placeholder="Value"
                                                    aria-label="New environment variable value"
                                                />
                                                <EyeOff className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                    New
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewEnvironmentVariable(variable.id)}
                                                    disabled={isSaving}
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                    aria-label="Remove new environment variable"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {variableSorting.sortedRows.map((variable) => (
                                    <tr key={variable.key}>
                                        <td className="px-4 py-3 align-top font-mono text-sm font-semibold text-slate-800">
                                            {variable.key}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="relative">
                                                <input
                                                    type={variable.isSensitive ? 'password' : 'text'}
                                                    value={draftValues[variable.key] ?? ''}
                                                    onChange={(event) =>
                                                        setDraftValues((currentDraftValues) => ({
                                                            ...currentDraftValues,
                                                            [variable.key]: event.target.value,
                                                        }))
                                                    }
                                                    disabled={!canEdit || isSaving}
                                                    className={`${INPUT_CLASS_NAME} ${
                                                        variable.isSensitive ? 'pr-10 tracking-wider' : ''
                                                    }`}
                                                    placeholder={variable.isSensitive ? HIDDEN_ENVIRONMENT_VALUE : ''}
                                                />
                                                {variable.isSensitive && (
                                                    <EyeOff className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    variable.isDefined
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                                }`}
                                            >
                                                {variable.isDefined ? 'Configured' : 'Empty'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {canEdit && (
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void saveVariables(false)}
                        disabled={isSaving || !hasChanges}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save .env
                    </button>
                    <button
                        type="button"
                        onClick={() => void saveVariables(true)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerCog className="h-4 w-4" />}
                        Save and apply VPS configuration
                    </button>
                </div>
            )}
        </div>
    );
}
