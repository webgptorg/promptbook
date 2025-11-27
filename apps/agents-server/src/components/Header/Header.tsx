'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { logoutAction } from '@/src/app/actions';
import { ArrowRight, LogIn, LogOut, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { just } from '../../../../../src/utils/organization/just';
import { LoginDialog } from '../LoginDialog/LoginDialog';

type HeaderProps = {
    /**
     * Is the user an admin
     */
    isAdmin?: boolean;

    /**
     * The name of the server
     */
    serverName: string;

    /**
     * The URL of the logo displayed in the heading bar
     */
    serverLogoUrl: string | null;
};

/* TODO: [🐱‍🚀] Make this Agents server native  */

export function Header(props: HeaderProps) {
    const { isAdmin = false, serverName, serverLogoUrl } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const handleLogout = async () => {
        await logoutAction();
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-[60px]">
            <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo <- TODO: This should be <h1>*/}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Image
                            src={serverLogoUrl || promptbookLogoBlueTransparent}
                            alt={serverName}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-xl text-gray-900">{serverName}</span>
                    </Link>

                    {/* Desktop Navigation */}
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {isAdmin && (
                            <>
                                <Link
                                    href="/"
                                    className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Agents
                                </Link>
                                <Link
                                    href="/"
                                    className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Models
                                </Link>
                                <Link
                                    href="/admin/metadata"
                                    className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Metadata
                                </Link>
                                <Link
                                    href="https://ptbk.io/"
                                    className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    About
                                </Link>
                            </>
                        )}

                        {just(false /* TODO: [🧠] Figure out what to do with theese links */) && (
                            <Link
                                href="https://ptbk.io/"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                Create your server
                            </Link>
                        )}
                    </nav>

                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
                        {just(false /* TODO: [🧠] Figure out what to do with call to action */) && (
                            <Link href="https://ptbk.io/?modal=get-started" target="_blank" className="hidden md:block">
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    Get Started
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </Link>
                        )}

                        {!isAdmin ? (
                            <button
                                onClick={() => {
                                    setIsLoginOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                Log in
                                <LogIn className="ml-2 w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                                Log out
                                <LogOut className="ml-2 w-4 h-4" />
                            </button>
                        )}

                        {/* Mobile Menu Toggle */}
                        {just(false /* TODO: [🧠] Figure out whether we want a menu */) && (
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
                {just(false /* TODO: [🧠] Figure out whether we want a menu */) && isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                        <nav className="flex flex-col gap-4">
                            <Link
                                href="https://ptbk.io/#try-it-yourself"
                                target="_blank"
                                className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Try it yourself
                            </Link>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
