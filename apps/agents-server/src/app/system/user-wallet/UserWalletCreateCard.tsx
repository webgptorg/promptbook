'use client';

import type { FormEvent } from 'react';
import type { UserWalletAgentOption } from './UserWalletAgentOption';
import type { UpdateUserWalletDraft, UserWalletDraft } from './UserWalletDraft';
import { UserWalletRecordFormFields } from './UserWalletRecordFormFields';

/**
 * Props for `UserWalletCreateCard`.
 */
type UserWalletCreateCardProps = {
    agents: ReadonlyArray<UserWalletAgentOption>;
    draft: UserWalletDraft;
    isSmtpRecord: boolean;
    isSaving: boolean;
    onApplyUseEmailSmtpTemplate: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    updateDraft: UpdateUserWalletDraft;
};

/**
 * Create-wallet card that wraps the shared record form fields.
 *
 * @private function of UserWalletClient
 */
export function UserWalletCreateCard({
    agents,
    draft,
    isSmtpRecord,
    isSaving,
    onApplyUseEmailSmtpTemplate,
    onSubmit,
    updateDraft,
}: UserWalletCreateCardProps) {
    return (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Create Wallet Record</h2>
                <button
                    type="button"
                    onClick={onApplyUseEmailSmtpTemplate}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                    Use SMTP template
                </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <UserWalletRecordFormFields
                    agents={agents}
                    draft={draft}
                    isSmtpRecord={isSmtpRecord}
                    updateDraft={updateDraft}
                    variant="create"
                />

                <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Store Wallet Record'}
                </button>
            </form>
        </div>
    );
}
