'use client';

import { Loader2, RefreshCw, X } from 'lucide-react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Dialog } from '../Portal/Dialog';
import { SecretInput } from '../SecretInput/SecretInput';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { USER_DIALOG_PRIMARY_BUTTON_CLASS_NAME, USER_DIALOG_SECONDARY_BUTTON_CLASS_NAME } from './userDialogClassNames';

/**
 * Styling for ordinary form inputs inside the create-user dialog.
 */
const CREATE_USER_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

/**
 * Props for the create-user dialog.
 *
 * @private component of <UsersList/>
 */
type CreateUserDialogProps = {
    readonly isAdmin: boolean;
    /** Whether the dialog can be dismissed through its backdrop or Escape key. */
    readonly isDismissible?: boolean;
    readonly isOpen: boolean;
    readonly isSubmitting: boolean;
    readonly onClose: () => void;
    readonly onOpenPasswordGenerator: () => void;
    readonly onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
    readonly password: string;
    readonly setIsAdmin: Dispatch<SetStateAction<boolean>>;
    readonly setPassword: Dispatch<SetStateAction<string>>;
    readonly setUsername: Dispatch<SetStateAction<string>>;
    readonly username: string;
};

/**
 * Renders the create-user dialog modelled after the create-server flow.
 *
 * @private component of <UsersList/>
 */
export function CreateUserDialog({
    isAdmin,
    isDismissible,
    isOpen,
    isSubmitting,
    onClose,
    onOpenPasswordGenerator,
    onSubmit,
    password,
    setIsAdmin,
    setPassword,
    setUsername,
    username,
}: CreateUserDialogProps) {
    const { t } = useServerLanguage();

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog onClose={onClose} isDismissible={isDismissible} className="mx-4 w-full max-w-lg overflow-hidden">
            <form onSubmit={(event) => void onSubmit(event)}>
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{t('users.createDialogTitle')}</h2>
                        <p className="mt-1 text-sm text-gray-500">{t('users.createDialogDescription')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label={t('users.closeCreateDialog')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-6">
                    <div>
                        <label htmlFor="create-user-username" className="mb-1 block text-sm font-medium text-gray-700">
                            {t('users.usernameLabel')}
                        </label>
                        <input
                            id="create-user-username"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className={CREATE_USER_INPUT_CLASS_NAME}
                            placeholder={t('users.usernamePlaceholder')}
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div>
                        <SecretInput
                            id="create-user-password"
                            label={t('users.passwordLabel')}
                            placeholder={t('users.passwordPlaceholder')}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            aria-label={t('users.passwordAriaLabel')}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={onOpenPasswordGenerator}
                            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                            <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                            {t('users.generatePassword')}
                        </button>
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={isAdmin}
                            onChange={(event) => setIsAdmin(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                            <span className="block font-semibold text-gray-900">{t('users.isAdminCheckbox')}</span>
                            <span className="mt-1 block">{t('users.adminRoleDescription')}</span>
                        </span>
                    </label>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={USER_DIALOG_SECONDARY_BUTTON_CLASS_NAME}>
                        {t('users.deleteConfirmCancel')}
                    </button>
                    <button type="submit" disabled={isSubmitting} className={USER_DIALOG_PRIMARY_BUTTON_CLASS_NAME}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t('users.createUser')}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
