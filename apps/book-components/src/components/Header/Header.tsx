import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import logo from '../../../public/logos/logo-blue-transparent-256.png';

export function Header() {
    return (
        <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between">
                    <Link href="/">
                        <div className="flex items-center space-x-4">
                            <Image src={logo} alt="Promptbook Logo" className="h-10 w-10" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Promptbook Components</h1>
                                <p className="text-gray-600">A gallery of React components for developers</p>
                            </div>
                        </div>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="https://github.com/webgptorg/promptbook"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            GitHub
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
