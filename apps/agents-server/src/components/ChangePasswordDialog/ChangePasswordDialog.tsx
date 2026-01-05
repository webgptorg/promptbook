'use client';

import { X } from 'lucide-react';
import { ChangePasswordForm } from '../ChangePasswordForm/ChangePasswordForm';
import { Dialog } from '../Portal/Dialog';

type ChangePasswordDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

export function ChangePasswordDialog(props: ChangePasswordDialogProps) {
    const { isOpen, onClose } = props;

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} className="w-full max-w-md p-6">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
            >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
            </button>

            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure</p>
            </div>

            <ChangePasswordForm onSuccess={onClose} />
        </Dialog>
    );
}
