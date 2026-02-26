'use client';

import { X } from 'lucide-react';
import { Dialog } from '../Portal/Dialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

type RegisterUserDialogProps = {
    onClose: () => void;
    adminEmail: string;
};

export function RegisterUserDialog(props: RegisterUserDialogProps) {
    const { onClose, adminEmail } = props;
    const { t } = useServerLanguage();

    return (
        <Dialog onClose={onClose} className="w-full max-w-md p-6">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
            >
                <X className="w-5 h-5" />
                <span className="sr-only">{t('common.close')}</span>
            </button>

            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('registerUser.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('registerUser.subtitle')}</p>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                        {t('registerUser.noEmailPrefix')}{' '}
                        <a
                            href={`mailto:${adminEmail}`}
                            className="font-medium text-blue-900 underline hover:text-blue-800"
                        >
                            {adminEmail}
                        </a>{' '}
                        {t('registerUser.noEmailSuffix')}
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                    {t('common.close')}
                </button>
            </div>
        </Dialog>
    );
}
