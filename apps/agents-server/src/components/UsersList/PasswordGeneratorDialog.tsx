'use client';

import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { Dialog } from '../Portal/Dialog';
import { SecretInput } from '../SecretInput/SecretInput';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import {
    DEFAULT_PASSWORD_GENERATOR_OPTIONS,
    generateSecurePassword,
    PASSWORD_CHARACTER_OPTION_NAMES,
    type PasswordCharacterOptionName,
    type PasswordGeneratorOptions,
} from './generateSecurePassword';
import { USER_DIALOG_PRIMARY_BUTTON_CLASS_NAME, USER_DIALOG_SECONDARY_BUTTON_CLASS_NAME } from './userDialogClassNames';

/**
 * Minimum password length offered by the password generator.
 */
const MINIMUM_PASSWORD_LENGTH = 1;

/**
 * Maximum password length offered by the password generator.
 */
const MAXIMUM_PASSWORD_LENGTH = 128;

/**
 * Translation keys for each configurable character category.
 */
const PASSWORD_CHARACTER_OPTION_TRANSLATION_KEYS: Readonly<Record<PasswordCharacterOptionName, ServerTranslationKey>> = {
    isUppercaseLettersIncluded: 'users.passwordGeneratorIncludeUppercaseLetters',
    isLowercaseLettersIncluded: 'users.passwordGeneratorIncludeLowercaseLetters',
    isNumbersIncluded: 'users.passwordGeneratorIncludeNumbers',
    isSpecialCharactersIncluded: 'users.passwordGeneratorIncludeSpecialCharacters',
};

/**
 * Props for the password generator dialog.
 *
 * @private component of <UsersList/>
 */
type PasswordGeneratorDialogProps = {
    readonly onClose: () => void;
    readonly onUsePassword: (password: string) => void;
};

/**
 * Renders configurable, Web Crypto-backed password generation for new users.
 *
 * @private component of <UsersList/>
 */
export function PasswordGeneratorDialog({ onClose, onUsePassword }: PasswordGeneratorDialogProps) {
    const { t } = useServerLanguage();
    const [passwordGeneratorOptions, setPasswordGeneratorOptions] = useState<PasswordGeneratorOptions>(
        DEFAULT_PASSWORD_GENERATOR_OPTIONS,
    );
    const [generatedPassword, setGeneratedPassword] = useState(() =>
        generateSecurePassword(DEFAULT_PASSWORD_GENERATOR_OPTIONS),
    );
    const includedCharacterOptionCount = PASSWORD_CHARACTER_OPTION_NAMES.filter(
        (optionName) => passwordGeneratorOptions[optionName],
    ).length;

    /**
     * Stores an updated configuration and creates a password that exactly matches it.
     */
    function updatePasswordGeneratorOptions(updatedPasswordGeneratorOptions: PasswordGeneratorOptions) {
        setPasswordGeneratorOptions(updatedPasswordGeneratorOptions);
        setGeneratedPassword(generateSecurePassword(updatedPasswordGeneratorOptions));
    }

    /**
     * Updates the requested length while preserving a valid count for the selected character categories.
     */
    function handlePasswordLengthChange(passwordLength: number) {
        if (!Number.isSafeInteger(passwordLength)) {
            return;
        }

        updatePasswordGeneratorOptions({
            ...passwordGeneratorOptions,
            length: Math.min(
                MAXIMUM_PASSWORD_LENGTH,
                Math.max(includedCharacterOptionCount, MINIMUM_PASSWORD_LENGTH, passwordLength),
            ),
        });
    }

    /**
     * Enables or disables one character category without allowing an empty character set.
     */
    function handleCharacterOptionChange(optionName: PasswordCharacterOptionName, isIncluded: boolean) {
        const updatedIncludedCharacterOptionCount = includedCharacterOptionCount +
            (isIncluded === passwordGeneratorOptions[optionName] ? 0 : isIncluded ? 1 : -1);

        if (updatedIncludedCharacterOptionCount === 0) {
            return;
        }

        const updatedPasswordGeneratorOptions: PasswordGeneratorOptions = {
            ...passwordGeneratorOptions,
            [optionName]: isIncluded,
        };

        updatePasswordGeneratorOptions({
            ...updatedPasswordGeneratorOptions,
            length: Math.max(updatedPasswordGeneratorOptions.length, updatedIncludedCharacterOptionCount),
        });
    }

    /**
     * Passes the current generated password back to the create-user form.
     */
    function handleUsePassword() {
        if (!generatedPassword) {
            return;
        }

        onUsePassword(generatedPassword);
    }

    return (
        <Dialog onClose={onClose} className="mx-4 w-full max-w-lg overflow-hidden" ariaLabelledBy="password-generator-title">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
                <div>
                    <h2 id="password-generator-title" className="text-xl font-semibold text-gray-900">
                        {t('users.passwordGeneratorTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{t('users.passwordGeneratorDescription')}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label={t('users.closePasswordGeneratorDialog')}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="space-y-5 px-6 py-6">
                <div>
                    <label htmlFor="password-generator-length" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('users.passwordGeneratorLength')}
                    </label>
                    <input
                        id="password-generator-length"
                        type="number"
                        min={Math.max(includedCharacterOptionCount, MINIMUM_PASSWORD_LENGTH)}
                        max={MAXIMUM_PASSWORD_LENGTH}
                        step="1"
                        value={passwordGeneratorOptions.length}
                        onChange={(event) => handlePasswordLengthChange(event.target.valueAsNumber)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-gray-700">
                        {t('users.passwordGeneratorCharacters')}
                    </legend>
                    <div className="space-y-2">
                        {PASSWORD_CHARACTER_OPTION_NAMES.map((optionName) => {
                            const isIncluded = passwordGeneratorOptions[optionName];
                            const isOnlyIncludedCharacterOption = isIncluded && includedCharacterOptionCount === 1;

                            return (
                                <label key={optionName} className="flex items-center gap-3 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={isIncluded}
                                        onChange={(event) => handleCharacterOptionChange(optionName, event.target.checked)}
                                        disabled={isOnlyIncludedCharacterOption}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    {t(PASSWORD_CHARACTER_OPTION_TRANSLATION_KEYS[optionName])}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                <SecretInput
                    id="password-generator-value"
                    label={t('users.generatedPassword')}
                    value={generatedPassword}
                    readOnly
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={() => setGeneratedPassword(generateSecurePassword(passwordGeneratorOptions))}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                    {t('users.regeneratePassword')}
                </button>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className={USER_DIALOG_SECONDARY_BUTTON_CLASS_NAME}>
                    {t('users.deleteConfirmCancel')}
                </button>
                <button
                    type="button"
                    onClick={handleUsePassword}
                    disabled={!generatedPassword}
                    className={USER_DIALOG_PRIMARY_BUTTON_CLASS_NAME}
                >
                    {t('users.useGeneratedPassword')}
                </button>
            </div>
        </Dialog>
    );
}
