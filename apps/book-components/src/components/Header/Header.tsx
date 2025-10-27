import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function Header() {
    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between">
                    <Link href="https://github.com/webgptorg/promptbook">
                        <div className="flex items-center space-x-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                                alt="Promptbook Logo"
                                className="h-10 w-10"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Promptbook Components</h1>
                                <p className="text-gray-600">A gallery of React components for developers</p>
                            </div>
                        </div>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <a
                            href="https://github.com/webgptorg/promptbook-components"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}
