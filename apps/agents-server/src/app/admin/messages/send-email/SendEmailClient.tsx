'use client';

import { useState } from 'react';
import { assertsError } from '../../../../../../../src/errors/assertsError';
import { sendEmailAction } from './actions';

export function SendEmailClient() {
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
            <h1 className="text-2xl font-bold mb-4">Send Email (Test)</h1>

            {status === 'SUCCESS' && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Email sent successfully!
                </div>
            )}

            {status === 'ERROR' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700">From</label>
                    <input
                        name="from"
                        type="text"
                        defaultValue="Test Promptbook <test@ptbk.io>"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 border p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">To</label>
                    <input
                        name="to"
                        type="text"
                        placeholder="recipient@example.com"
                        defaultValue="Pavol Hejný <pavol@ptbk.io>"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 border p-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple addresses with commas</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input
                        name="subject"
                        type="text"
                        placeholder="Test Email"
                        defaultValue="Test Email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 border p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Body</label>
                    <textarea
                        name="body"
                        rows={6}
                        placeholder="Hello, this is a test email."
                        defaultValue="Hello, this is a test email."
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 border p-2"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === 'LOADING'}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                    {status === 'LOADING' ? 'Sending...' : 'Send Email'}
                </button>
            </form>
        </div>
    );
}
