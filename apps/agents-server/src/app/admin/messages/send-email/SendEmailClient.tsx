'use client';

import { type FormEvent, useState } from 'react';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { sendEmailAction } from './actions';

/**
 * Existing agent address offered as a one-click form prefill.
 */
export type EmailTestingAgentOption = {
    readonly id: string;
    readonly label: string;
    readonly address: string;
};

/**
 * Props accepted by the email testing client.
 */
type SendEmailClientProps = {
    readonly currentServerDomain: string;
    readonly isGlobalAdmin: boolean;
    readonly agentEmailOptions: ReadonlyArray<EmailTestingAgentOption>;
};

/**
 * Props accepted by an address editor with optional agent-address prefills.
 */
type EmailTestingAddressInputProps = {
    readonly label: string;
    readonly name: 'from' | 'to';
    readonly value: string;
    readonly placeholder: string;
    readonly helperText: string;
    readonly agentEmailOptions: ReadonlyArray<EmailTestingAgentOption>;
    readonly isDisabled: boolean;
    readonly onValueChange: (value: string) => void;
};

/**
 * Renders one arbitrary email-address input and lets administrators pre-fill it from an existing agent.
 */
function EmailTestingAddressInput({
    label,
    name,
    value,
    placeholder,
    helperText,
    agentEmailOptions,
    isDisabled,
    onValueChange,
}: EmailTestingAddressInputProps) {
    const helperTextId = `${name}-helper-text`;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
                {agentEmailOptions.length > 0 ? (
                    <select
                        aria-label={`Pre-fill ${label.toLowerCase()} with an existing agent address`}
                        value=""
                        onChange={(event) => {
                            if (event.target.value) {
                                onValueChange(event.target.value);
                            }
                        }}
                        disabled={isDisabled}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                    >
                        <option value="">Pre-fill from an agent</option>
                        {agentEmailOptions.map((agent) => (
                            <option key={agent.id} value={agent.address}>
                                {agent.label} — {agent.address}
                            </option>
                        ))}
                    </select>
                ) : null}
            </div>
            <input
                id={name}
                name={name}
                type="text"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={placeholder}
                aria-describedby={helperTextId}
                required
                disabled={isDisabled}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100"
            />
            <p id={helperTextId} className="mt-1 text-xs text-gray-500">
                {helperText}
            </p>
        </div>
    );
}

/**
 * Explains the domain scope available to the current administrator.
 */
function getEmailTestingScopeMessage(currentServerDomain: string, isGlobalAdmin: boolean): string {
    if (isGlobalAdmin) {
        return 'As the superadmin, you can use a sender address from any domain.';
    }

    return `You can use any recipient address, but the sender must use ${currentServerDomain}.`;
}

/**
 * Renders and submits the administration email testing form.
 */
export function SendEmailClient({
    currentServerDomain,
    isGlobalAdmin,
    agentEmailOptions,
}: SendEmailClientProps) {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const isLoading = status === 'LOADING';

    /**
     * Sends the currently composed test email and displays the server-side outcome.
     */
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus('LOADING');
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        try {
            await sendEmailAction(formData);
            setStatus('SUCCESS');
        } catch (error) {
            assertsError(error);
            console.error(error);
            setStatus('ERROR');
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="mx-auto mt-20 max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Email testing</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Send a manually composed email through this server&apos;s email service.
                    </p>
                    <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-950">
                        {getEmailTestingScopeMessage(currentServerDomain, isGlobalAdmin)}
                    </p>
                </div>

                {status === 'SUCCESS' && (
                    <div className="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
                        Email sent successfully!
                    </div>
                )}

                {status === 'ERROR' && (
                    <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
                        Error: {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <EmailTestingAddressInput
                        label="From"
                        name="from"
                        value={from}
                        onValueChange={setFrom}
                        placeholder={`Sender <sender@${currentServerDomain}>`}
                        helperText="Enter any valid sender address, or pre-fill one of this server's agents."
                        agentEmailOptions={agentEmailOptions}
                        isDisabled={isLoading}
                    />

                    <EmailTestingAddressInput
                        label="To"
                        name="to"
                        value={to}
                        onValueChange={setTo}
                        placeholder="recipient@example.com"
                        helperText="Separate multiple addresses with commas."
                        agentEmailOptions={agentEmailOptions}
                        isDisabled={isLoading}
                    />

                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                            Subject
                        </label>
                        <input
                            id="subject"
                            name="subject"
                            type="text"
                            placeholder="Test email"
                            defaultValue="Test email"
                            required
                            disabled={isLoading}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                            Body
                        </label>
                        <textarea
                            id="body"
                            name="body"
                            rows={6}
                            placeholder="Hello, this is a test email."
                            defaultValue="Hello, this is a test email."
                            required
                            disabled={isLoading}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send email'}
                    </button>
                </form>
            </div>
        </div>
    );
}
