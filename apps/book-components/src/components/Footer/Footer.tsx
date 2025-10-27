export function Footer() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://www.ptbk.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-blue-transparent-256.493b7e49.png&w=64&q=75"
                                alt="Promptbook Logo"
                                className="h-8 w-8"
                            />
                            <span className="text-xl font-bold">Promptbook</span>
                        </div>
                        <p className="text-gray-400 mb-4">
                            Revolutionizing software development with natural language programming. Build AI
                            applications in minutes, not weeks.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="https://github.com/webgptorg/promptbook"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                GitHub
                            </a>
                            <a
                                href="https://www.ptbk.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Website
                            </a>
                            <a
                                href="https://promptbook.studio"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Studio
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="https://www.ptbk.io/get-started"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Get Started
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.ptbk.io/manifest"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/webgptorg/promptbook/discussions"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Community
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="https://aldaron.ptbk.io"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Aldaron AI
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.pavolhejny.com"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    About
                                </a>
                            </li>
                            <li>
                                <a
                                    href="mailto:me@pavolhejny.com"
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    Contact
                                </a>
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
