'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useFileUploadAvailability } from './FileUploadAvailabilityContext';

/**
 * Props consumed by `FileUploadUnavailableNotice`.
 */
type FileUploadUnavailableNoticeProps = {
    /**
     * Optional classes appended to the notice root.
     */
    readonly className?: string;
};

/**
 * Shows a shared notice when file uploads are disabled for the current server.
 *
 * @param props - Notice props.
 * @returns Upload notice or `null` when uploads are available.
 */
export function FileUploadUnavailableNotice({ className }: FileUploadUnavailableNoticeProps) {
    const fileUploadAvailability = useFileUploadAvailability();

    if (fileUploadAvailability.isUploadAvailable || !fileUploadAvailability.message) {
        return null;
    }

    return (
        <div
            className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${
                className || ''
            }`}
        >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div className="space-y-1">
                <p className="font-medium">{fileUploadAvailability.message}</p>
                <Link href="/admin/servers" className="inline-flex font-semibold underline underline-offset-2">
                    Open server/domain settings
                </Link>
            </div>
        </div>
    );
}
