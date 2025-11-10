import { CLAIM } from '@promptbook-local/core';
import Image from 'next/image';
import Link from 'next/link';
import logo from '../../../public/logos/logo-blue-white-256.png';

export function Footer() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                            <Image src={logo} alt="Promptbook Logo" className="h-10 w-10" />
                            <span className="text-xl font-bold">Promptbook</span>
                        </div>
                        <p className="text-gray-400 mb-4">{CLAIM}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="https://www.ptbk.io/"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Get Started
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://github.com/webgptorg/promptbook"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://discord.gg/x3QWNaa89N"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Community
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="https://github.com/webgptorg/promptbook"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    GitHub
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://www.facebook.com/61560776453536"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Facebook
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://linkedin.com/company/promptbook"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    LinkedIn
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; 2025 Promptbook. All rights reserved. Open source and built with ❤️</p>
                </div>
            </div>
        </footer>
    );
}
