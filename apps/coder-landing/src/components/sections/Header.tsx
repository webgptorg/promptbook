'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import logoImage from '@public/logo-white-transparent-1024.png';
import { GITHUB_URL, HEADER_NAVIGATION } from '@/data/links';

/**
 * Renders the sticky page header with logo, anchor navigation and GitHub link.
 *
 * Note: Specified in [`specs/sections/header.md`](../../../specs/sections/header.md)
 */
export function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-promptbook-dark-gray/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
                <Link href="/" className="flex items-center gap-2.5">
                    <Image src={logoImage} alt="Promptbook logo" width={32} height={32} />
                    <span className="font-display text-lg font-semibold tracking-tight text-white">
                        ptbk <span className="text-promptbook-blue">coder</span>
                    </span>
                </Link>

                <nav className="hidden flex-1 items-center gap-6 md:flex" aria-label="Page sections">
                    {HEADER_NAVIGATION.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-gray-300 transition-colors hover:text-promptbook-blue"
                        >
                            {link.title}
                        </a>
                    ))}
                </nav>

                <div className="ml-auto hidden items-center gap-3 md:flex">
                    <a
                        href={GITHUB_URL}
                        className="rounded-lg border border-gray-700 px-3.5 py-1.5 text-sm text-gray-200 transition-colors hover:border-promptbook-blue hover:text-promptbook-blue"
                    >
                        GitHub
                    </a>
                    <a
                        href="#quickstart"
                        className="rounded-lg bg-promptbook-blue px-3.5 py-1.5 text-sm font-semibold text-promptbook-dark-gray transition-colors hover:bg-promptbook-green"
                    >
                        Get started
                    </a>
                </div>

                <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMobileMenuOpen}
                    className="ml-auto rounded-lg border border-gray-700 p-2 text-gray-200 md:hidden"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                        {isMobileMenuOpen ? (
                            <g strokeLinecap="round">
                                <line x1="4" y1="4" x2="16" y2="16" />
                                <line x1="16" y1="4" x2="4" y2="16" />
                            </g>
                        ) : (
                            <g strokeLinecap="round">
                                <line x1="3" y1="5" x2="17" y2="5" />
                                <line x1="3" y1="10" x2="17" y2="10" />
                                <line x1="3" y1="15" x2="17" y2="15" />
                            </g>
                        )}
                    </svg>
                </button>
            </div>

            {isMobileMenuOpen && (
                <nav
                    className="flex flex-col gap-1 border-t border-gray-800 px-4 py-3 md:hidden"
                    aria-label="Page sections"
                >
                    {HEADER_NAVIGATION.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="rounded-lg px-2 py-2 text-gray-200 hover:bg-gray-800"
                        >
                            {link.title}
                        </a>
                    ))}
                    <a href={GITHUB_URL} className="rounded-lg px-2 py-2 text-gray-200 hover:bg-gray-800">
                        GitHub
                    </a>
                </nav>
            )}
        </header>
    );
}
