'use client';

import { RefreshCcw } from 'lucide-react';
import { useActionState } from 'react';
import type { StalwartSynchronizationResult } from '../../utils/stalwart/captureStalwartSynchronizationResult';

/**
 * Synchronization button shared by the per-server and VPS-wide Stalwart administration pages.
 *
 * The synchronization runs against a mail service which can be unreachable or still bootstrapping, so its
 * failure is rendered next to the button instead of replacing the whole page with a server error.
 *
 * @private shared by the Agents Server email administration views
 */
export function StalwartSynchronizeButton({
    label,
    synchronize,
}: {
    /**
     * Caption of the submit button.
     */
    readonly label: string;

    /**
     * Server action performing the synchronization.
     */
    readonly synchronize: () => Promise<StalwartSynchronizationResult>;
}) {
    const [result, submitAction, isPending] = useActionState<StalwartSynchronizationResult | null, FormData>(
        () => synchronize(),
        null,
    );

    return (
        <form action={submitAction} className="flex flex-col items-start gap-2">
            <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-progress disabled:opacity-60"
            >
                <RefreshCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                {isPending ? 'Synchronizing…' : label}
            </button>
            {result?.isSuccessful ? (
                <p className="max-w-xl text-xs text-emerald-700">Stalwart synchronization finished.</p>
            ) : null}
            {result?.errorMessage ? (
                <p className="max-w-xl whitespace-pre-wrap text-xs text-red-700">{result.errorMessage}</p>
            ) : null}
        </form>
    );
}
