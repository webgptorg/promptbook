'use client';

import { KeyRound, X } from 'lucide-react';
import { Dialog } from '../Portal/Dialog';
import { WalletRecordDialogContent } from './WalletRecordDialogContent';
import { useWalletRecordDialogState } from './useWalletRecordDialogState';

/**
 * Wallet record type supported by the dialog.
 */
export type WalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Pending wallet request shown in the dialog.
 */
export type PendingWalletRecordRequest = {
    marker: string;
    sourceToolName: string;
    recordType: WalletRecordType;
    service: string;
    key: string;
    jsonSchema?: unknown;
    message?: string;
    isUserScoped: boolean;
    isGlobal: boolean;
    calendarOAuth?: {
        provider: 'google';
        calendarUrl: string;
        scopes: string[];
    };
};

/**
 * Wallet payload submitted from the dialog.
 */
export type WalletRecordDialogSubmitPayload = {
    recordType: WalletRecordType;
    service: string;
    key: string;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
    jsonSchema?: unknown;
    isUserScoped: boolean;
    isGlobal: boolean;
};

/**
 * GitHub App connect settings passed into the shared wallet dialog.
 */
export type WalletRecordDialogGithubAppOptions = {
    isConfigured: boolean;
    returnTo?: string;
    agentPermanentId?: string | null;
};

/**
 * Calendar OAuth connect settings passed into the shared wallet dialog.
 */
export type WalletRecordDialogCalendarOAuthOptions = {
    isConfigured: boolean;
    returnTo?: string;
    agentPermanentId?: string | null;
};

/**
 * Props for wallet record dialog.
 */
export type WalletRecordDialogProps = {
    isOpen: boolean;
    request: PendingWalletRecordRequest | null;
    onSubmit: (payload: WalletRecordDialogSubmitPayload) => Promise<void> | void;
    onClose: () => void;
    githubApp?: WalletRecordDialogGithubAppOptions;
    calendarOAuth?: WalletRecordDialogCalendarOAuthOptions;
};

/**
 * Props for the wallet dialog header.
 */
type WalletRecordDialogHeaderProps = {
    /**
     * Accessible close-label for the dismiss button.
     */
    readonly closeAriaLabel: string;
    /**
     * Whether the dialog is currently submitting.
     */
    readonly isSubmitting: boolean;
    /**
     * Closes the dialog when triggered.
     */
    readonly onClose: () => void;
    /**
     * Short subtitle shown under the dialog title.
     */
    readonly subtitle: string;
    /**
     * Main dialog heading.
     */
    readonly title: string;
};

/**
 * Dialog that captures one wallet credential record from user.
 */
export function WalletRecordDialog(props: WalletRecordDialogProps) {
    const { isOpen, request } = props;
    const state = useWalletRecordDialogState(props);

    if (!isOpen || !request) {
        return null;
    }

    return (
        <Dialog onClose={state.requestClose} isBackdropDismissible={false} className="w-full max-w-xl p-0 overflow-hidden">
            <WalletRecordDialogHeader
                title={state.t('walletDialog.title')}
                subtitle={state.t('walletDialog.subtitle')}
                closeAriaLabel={state.t('walletDialog.closeAriaLabel')}
                isSubmitting={state.isSubmitting}
                onClose={state.requestClose}
            />
            <WalletRecordDialogContent request={request} state={state} />
        </Dialog>
    );
}

/**
 * Renders the dialog chrome shared across every wallet request variant.
 *
 * @private function of WalletRecordDialog
 */
function WalletRecordDialogHeader({
    closeAriaLabel,
    isSubmitting,
    onClose,
    subtitle,
    title,
}: WalletRecordDialogHeaderProps) {
    return (
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <KeyRound className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500">{subtitle}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={closeAriaLabel}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
