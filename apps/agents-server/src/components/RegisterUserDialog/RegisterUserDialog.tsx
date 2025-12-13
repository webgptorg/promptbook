'use client';

import { X } from 'lucide-react';
import { Portal } from '../Portal/Portal';

type RegisterUserDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    adminEmail: string;
};

export function RegisterUserDialog(props: RegisterUserDialogProps) {
    const { isOpen, onClose, adminEmail } = props;

    if (!isOpen) {
        return null;
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-6 animate-in zoom-in-95 duration-200">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                        <span className="sr-only">Close</span>
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Register New User</h2>
                        <p className="text-sm text-gray-500 mt-1">Create a new user account</p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                                This Promptbook server has no email capability. Please contact the administrator at{' '}
                                <a
                                    href={`mailto:${adminEmail}`}
                                    className="font-medium text-blue-900 underline hover:text-blue-800"
                                >
                                    {adminEmail}
                                </a>{' '}
                                to register new user.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
