import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function RestrictedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <ShieldAlert className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-gray-600 max-w-md mb-8">
                This server is restricted to authorized users or specific IP addresses. 
                Please log in to continue or contact the administrator if you believe this is an error.
            </p>
            
            {/* The Login button in the header is available, so we can just point to it or instruct the user */}
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg max-w-md text-sm">
                <p>
                    <strong>Tip:</strong> Use the <strong>Log in</strong> button in the top right corner to access your account.
                </p>
            </div>

            <div className="mt-8 flex gap-4">
                <Link 
                    href="/"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                    Go Home
                </Link>
            </div>
        </div>
    );
}
