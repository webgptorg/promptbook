/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { ServerLanguageProvider } from '../ServerLanguage/ServerLanguageProvider';
import { PasswordGeneratorDialog } from './PasswordGeneratorDialog';

/**
 * Renders the password generator in the same portal and language context used by the application.
 */
function renderPasswordGeneratorDialog(onUsePassword = jest.fn()) {
    render(
        <ServerLanguageProvider defaultLanguage="en">
            <PasswordGeneratorDialog onClose={jest.fn()} onUsePassword={onUsePassword} />
        </ServerLanguageProvider>,
    );

    return onUsePassword;
}

describe('PasswordGeneratorDialog', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    it('uses the secure default configuration and returns a password matching changed options', () => {
        const onUsePassword = renderPasswordGeneratorDialog();
        const passwordLengthInput = screen.getByLabelText('Password length') as HTMLInputElement;

        expect(passwordLengthInput.value).toBe('16');
        expect((screen.getByLabelText('Include uppercase letters') as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText('Include lowercase letters') as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText('Include numbers') as HTMLInputElement).checked).toBe(true);
        expect((screen.getByLabelText('Include special characters') as HTMLInputElement).checked).toBe(true);

        fireEvent.change(passwordLengthInput, { target: { value: '24', valueAsNumber: 24 } });
        fireEvent.click(screen.getByLabelText('Include lowercase letters'));

        const generatedPasswordInput = screen.getByLabelText('Generated password') as HTMLInputElement;
        expect(generatedPasswordInput.value).toHaveLength(24);
        expect(generatedPasswordInput.value).not.toMatch(/[a-z]/);

        fireEvent.click(screen.getByRole('button', { name: 'Use generated password' }));

        expect(onUsePassword).toHaveBeenCalledWith(generatedPasswordInput.value);
    });
});
