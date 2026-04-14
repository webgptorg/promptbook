'use client';

import type { UserWalletRecord } from '@/src/utils/userWallet';
import type { UserWalletAgentOption } from './UserWalletAgentOption';
import { formatWalletJsonSchemaForTextarea, type EditingUserWalletDraft, type UpdateUserWalletDraft } from './UserWalletDraft';
import { UserWalletRecordFormFields } from './UserWalletRecordFormFields';
import { UserWalletRecordValue } from './UserWalletRecordValue';

/**
 * Props for `UserWalletRecordsTable`.
 */
type UserWalletRecordsTableProps = {
    agents: ReadonlyArray<UserWalletAgentOption>;
    editingDraft: EditingUserWalletDraft | null;
    isEditingSmtpRecord: boolean;
    isLoading: boolean;
    isSaving: boolean;
    onCancelEditing: () => void;
    onDeleteRecord: (record: UserWalletRecord) => Promise<void>;
    onSaveEditingRecord: () => Promise<void>;
    onStartEditing: (record: UserWalletRecord) => void;
    records: ReadonlyArray<UserWalletRecord>;
    resolveScopeLabel: (record: UserWalletRecord) => string;
    updateEditingDraft: UpdateUserWalletDraft;
};

/**
 * Wallet-record list table with inline edit support.
 *
 * @private function of UserWalletClient
 */
export function UserWalletRecordsTable({
    agents,
    editingDraft,
    isEditingSmtpRecord,
    isLoading,
    isSaving,
    onCancelEditing,
    onDeleteRecord,
    onSaveEditingRecord,
    onStartEditing,
    records,
    resolveScopeLabel,
    updateEditingDraft,
}: UserWalletRecordsTableProps) {
    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Scope
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Service / Key
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Updated
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Actions
                        </th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                    {isLoading ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                                Loading wallet records...
                            </td>
                        </tr>
                    ) : records.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                                No wallet records found.
                            </td>
                        </tr>
                    ) : (
                        records.map((record) => {
                            const isEditing = editingDraft?.id === record.id;
                            const schemaPreview = formatWalletJsonSchemaForTextarea(record.jsonSchema);

                            return (
                                <tr key={record.id}>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {resolveScopeLabel(record)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">{record.recordType}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        <div>
                                            {record.service} / {record.key}
                                        </div>

                                        {schemaPreview && (
                                            <UserWalletSchemaPreview schemaPreview={schemaPreview} />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {isEditing && editingDraft ? (
                                            <div className="space-y-2">
                                                <UserWalletRecordFormFields
                                                    agents={agents}
                                                    draft={editingDraft}
                                                    isSmtpRecord={isEditingSmtpRecord}
                                                    updateDraft={updateEditingDraft}
                                                    variant="edit"
                                                />
                                            </div>
                                        ) : (
                                            <UserWalletRecordValue record={record} />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(record.updatedAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => void onSaveEditingRecord()}
                                                    disabled={isSaving}
                                                    className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={onCancelEditing}
                                                    className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onStartEditing(record)}
                                                    className="rounded-md bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => void onDeleteRecord(record)}
                                                    className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Compact schema preview used inside the service/key column.
 */
function UserWalletSchemaPreview(props: { schemaPreview: string }) {
    return (
        <details className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
            <summary className="cursor-pointer text-xs font-medium text-gray-600">JSON schema</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-gray-600">
                {props.schemaPreview}
            </pre>
        </details>
    );
}
