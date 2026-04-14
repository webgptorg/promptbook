'use client';

import { SecretInput } from '@/src/components/SecretInput/SecretInput';
import { SecretTextarea } from '@/src/components/SecretTextarea/SecretTextarea';
import type { UserWalletRecord } from '@/src/utils/userWallet';

/**
 * Props for `UserWalletRecordValue`.
 */
type UserWalletRecordValueProps = {
    record: UserWalletRecord;
};

/**
 * Read-only wallet-record value renderer with record-type-specific views.
 *
 * @private function of UserWalletClient
 */
export function UserWalletRecordValue({ record }: UserWalletRecordValueProps) {
    if (record.recordType === 'USERNAME_PASSWORD') {
        return (
            <div className="space-y-2">
                <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
                    {record.username || '-'}
                </div>
                <SecretInput
                    value={record.password || ''}
                    readOnly
                    aria-label="Wallet password"
                    inputClassName="h-9 text-xs"
                />
            </div>
        );
    }

    if (record.recordType === 'SESSION_COOKIE') {
        return (
            <SecretTextarea
                value={record.cookies || ''}
                readOnly
                aria-label="Wallet cookies"
                textareaClassName="!min-h-[72px] font-mono text-xs leading-5"
            />
        );
    }

    return (
        <SecretTextarea
            value={record.secret || ''}
            readOnly
            aria-label="Wallet secret"
            textareaClassName="!min-h-[72px] font-mono text-xs leading-5"
        />
    );
}
