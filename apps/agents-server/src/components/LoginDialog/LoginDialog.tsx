'use client';

import { X } from 'lucide-react';
import { LoginForm } from '../LoginForm/LoginForm';
import { Dialog } from '../Portal/Dialog';

type LoginDialogProps = {
    /**
     * Optional heading shown in the dialog.
     */
    readonly title?: string;
    /**
     * Optional description shown under the heading.
     */
    readonly description?: string;
    /**
     * When true, refreshes the current route after a successful login.
     */
    readonly refreshAfterSuccess?: boolean;
    /**
     * Called when the user successfully logs in.
     */
    readonly onSuccess: () => void | Promise<void>;
    /**
     * Called when the dialog is dismissed without logging in.
     */
    readonly onCancel: () => void;
};

/**
 * Renders the login dialog inside the async modal shell.
 *
 * @param props - Dialog configuration.
 * @private @@@
 */
export function LoginDialog(props: LoginDialogProps) {
    const { title, description, refreshAfterSuccess, onSuccess, onCancel } = props;
    const dialogTitle = title ?? 'Log in';
    const dialogDescription = description ?? 'Enter your credentials to access the admin area';

    return (
        <Dialog onClose={onCancel} className="w-full max-w-md p-6">
            <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
                type="button"
            >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
            </button>

            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{dialogTitle}</h2>
                <p className="text-sm text-gray-500 mt-1">{dialogDescription}</p>
            </div>

            <LoginForm onSuccess={onSuccess} refreshAfterSuccess={refreshAfterSuccess} />
        </Dialog>
    );
}
