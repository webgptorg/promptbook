import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Test OG Image',
    description: 'Testing og-image',
};

export default function TestPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4 text-center">Test page</h1>
                <p className="text-gray-700 mb-6 text-center">Testing og-image</p>
                <p className="text-gray-600 text-sm text-center mt-4">
                    View page source or share this URL to see the OG image in action
                </p>
            </div>
        </div>
    );
}
