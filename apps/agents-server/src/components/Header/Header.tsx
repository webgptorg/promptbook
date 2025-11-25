'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { ArrowRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type HeaderProps = {
    /**
     * Is bare header without navigation and CTA button
     */
    isBare?: boolean;
    tryItYourselfText?: string;
    whyPromptbookText?: string;
    integrationsText?: string;
    pricingText?: string;
    getStartedText?: string;
};

/* TODO: !!!!! Make this Agents server native  */

export function Header(props: HeaderProps) {
    const {
        isBare = false,
        tryItYourselfText = 'Try it Yourself!',
        whyPromptbookText = 'Why Promptbook?',
        integrationsText = 'Integrations',
        pricingText = 'Pricing',
        getStartedText = 'Get Started',
    } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Image
                            src={promptbookLogoBlueTransparent}
                            alt="Promptbook"
                            width={32}
                            height={32}
                            className="w-8 h-8"
                        />
                        <span className="text-xl text-gray-900">
                            Prompt<b>book</b>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    {!isBare && (
                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                href="https://ptbk.io/#try-it-yourself"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                {tryItYourselfText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#benefits"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                {whyPromptbookText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#integrations"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                {integrationsText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#pricing"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                {pricingText}
                            </Link>
                        </nav>
                    )}

                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
                        {!isBare && (
                            <Link href="https://ptbk.io/?modal=get-started" target="_blank" className="hidden md:block">
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    {getStartedText}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </Link>
                        )}

                        {/* Mobile Menu Toggle */}
                        {!isBare && (
                            <button
                                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation */}
                {!isBare && isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                        <nav className="flex flex-col gap-4">
                            <Link
                                href="https://ptbk.io/#try-it-yourself"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {tryItYourselfText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#benefits"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {whyPromptbookText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#integrations"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {integrationsText}
                            </Link>
                            <Link
                                href="https://ptbk.io/#pricing"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {pricingText}
                            </Link>
                            <Link
                                href="https://ptbk.io/?modal=get-started"
                                target="_blank"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    {getStartedText}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </Link>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
