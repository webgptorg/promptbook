'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { $createAgentAction, logoutAction } from '@/src/app/actions';
import { ArrowRight, ChevronDown, LogIn, LogOut, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { COMMITMENT_REGISTRY } from '../../../../../src/commitments';
import { just } from '../../../../../src/utils/organization/just';
import type { UserInfo } from '../../utils/getCurrentUser';
import { LoginDialog } from '../LoginDialog/LoginDialog';
import { useUsersAdmin } from '../UsersList/useUsersAdmin';

type HeaderProps = {
    /**
     * Is the user an admin
     */
    isAdmin?: boolean;

    /**
     * Current user info (if logged in)
     */
    currentUser?: UserInfo | null;

    /**
     * The name of the server
     */
    serverName: string;

    /**
     * The URL of the logo displayed in the heading bar
     */
    serverLogoUrl: string | null;

    /**
     * List of agents
     */
    agents: Array<AgentBasicInformation>;
};

/* TODO: [🐱‍🚀] Make this Agents server native  */

export function Header(props: HeaderProps) {
    const { isAdmin = false, currentUser = null, serverName, serverLogoUrl, agents } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isAgentsOpen, setIsAgentsOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isUsersOpen, setIsUsersOpen] = useState(false);
    const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
    const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
    const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);
    const router = useRouter();

    const { users: adminUsers } = useUsersAdmin();

    const handleLogout = async () => {
        await logoutAction();
    };

    const handleCreateAgent = async () => {
        await $createAgentAction();
        router.refresh();
        setIsAgentsOpen(false);
        setIsMenuOpen(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16">
            <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            <div className="container mx-auto px-4 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Image
                            src={serverLogoUrl || promptbookLogoBlueTransparent}
                            alt={serverName}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain"
                        />
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">{serverName}</h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">
                        <div className="relative">
                            <button
                                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                onClick={() => setIsDocsOpen(!isDocsOpen)}
                                onBlur={() => setTimeout(() => setIsDocsOpen(false), 200)}
                            >
                                Documentation
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {isDocsOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                    <Link
                                        href="/docs"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium border-b border-gray-100"
                                    >
                                        Overview
                                    </Link>
                                    {COMMITMENT_REGISTRY.map((commitment) => (
                                        <Link
                                            key={commitment.type}
                                            href={`/docs/${commitment.type}`}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        >
                                            {commitment.type}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <>
                                <div className="relative">
                                    <button
                                        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                        onClick={() => setIsAgentsOpen(!isAgentsOpen)}
                                        onBlur={() => setTimeout(() => setIsAgentsOpen(false), 200)}
                                    >
                                        Agents
                                        <ChevronDown className="w-4 h-4" />
                                    </button>

                                    {isAgentsOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {agents.map((agent) => (
                                                <Link
                                                    key={agent.agentName}
                                                    href={`/${agent.agentName}`}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                >
                                                    {agent.meta.fullname || agent.agentName}
                                                </Link>
                                            ))}
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <Link
                                                href="/"
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                            >
                                                View all agents
                                            </Link>
                                            <button
                                                onClick={handleCreateAgent}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                            >
                                                Create new agent
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <Link
                                    href="/admin/models"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Models
                                </Link>
                                <div className="relative">
                                    <button
                                        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                        onClick={() => setIsUsersOpen(!isUsersOpen)}
                                        onBlur={() => setTimeout(() => setIsUsersOpen(false), 200)}
                                    >
                                        Users
                                        <ChevronDown className="w-4 h-4" />
                                    </button>

                                    {isUsersOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                            {adminUsers.map((user) => (
                                                <Link
                                                    key={user.id}
                                                    href={`/admin/users/${encodeURIComponent(user.username)}`}
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                                    onClick={() => setIsUsersOpen(false)}
                                                >
                                                    {user.username}
                                                </Link>
                                            ))}
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <Link
                                                href="/admin/users"
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                                onClick={() => setIsUsersOpen(false)}
                                            >
                                                View all users
                                            </Link>
                                            <Link
                                                href="/admin/users#create-user"
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                                onClick={() => setIsUsersOpen(false)}
                                            >
                                                Create new user
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <Link
                                    href="/admin/metadata"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Metadata
                                </Link>
                                <Link
                                    href="/admin/chat-history"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Chat history
                                </Link>
                                <Link
                                    href="/admin/chat-feedback"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    Chat feedback
                                </Link>
                                <Link
                                    href="https://ptbk.io/"
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                >
                                    About
                                </Link>
                            </>
                        )}

                        {just(false /* TODO: [🧠] Figure out what to do with theese links */) && (
                            <Link
                                href="https://ptbk.io/"
                                target="_blank"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
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

                        {!currentUser && !isAdmin && (
                            <button
                                onClick={() => {
                                    setIsLoginOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="hidden lg:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                                Log in
                                <LogIn className="ml-2 w-4 h-4" />
                            </button>
                        )}

                        {(currentUser || isAdmin) && (
                            <div className="hidden lg:flex items-center gap-3">
                                <span className="inline text-sm text-gray-600">
                                    Logged in as <strong>{currentUser?.username || 'Admin'}</strong>
                                    {(currentUser?.isAdmin || isAdmin) && (
                                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                            Admin
                                        </span>
                                    )}
                                </span>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                >
                                    Log out
                                    <LogOut className="ml-2 w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-gray-100 animate-in slide-in-from-top-2 h-[calc(100vh-4rem)] overflow-y-auto">
                        <nav className="flex flex-col gap-4 px-2">
                            <div className="flex flex-col">
                                <button
                                    className="w-full flex items-center justify-between text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                    onClick={() => setIsMobileDocsOpen(!isMobileDocsOpen)}
                                >
                                    Documentation
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                            isMobileDocsOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {isMobileDocsOpen && (
                                    <div className="pl-4 flex flex-col gap-2 border-l-2 border-gray-100 ml-1 mt-1">
                                        <Link
                                            href="/docs"
                                            className="block text-sm font-medium text-gray-900 hover:text-gray-700 py-2"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Overview
                                        </Link>
                                        {COMMITMENT_REGISTRY.map((commitment) => (
                                            <Link
                                                key={commitment.type}
                                                href={`/docs/${commitment.type}`}
                                                className="block text-sm text-gray-600 hover:text-gray-900 py-2"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                {commitment.type}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="flex flex-col">
                                    <button
                                        className="w-full flex items-center justify-between text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMobileAgentsOpen(!isMobileAgentsOpen)}
                                    >
                                        Agents
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform duration-200 ${
                                                isMobileAgentsOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>
                                    {isMobileAgentsOpen && (
                                        <div className="pl-4 flex flex-col gap-2 border-l-2 border-gray-100 ml-1 mt-1">
                                            {agents.map((agent) => (
                                                <Link
                                                    key={agent.agentName}
                                                    href={`/${agent.agentName}`}
                                                    className="block text-sm text-gray-600 hover:text-gray-900 py-2"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    {agent.meta.fullname || agent.agentName}
                                                </Link>
                                            ))}
                                            <Link
                                                href="/"
                                                className="block text-sm font-medium text-gray-900 hover:text-gray-700 py-2"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                View all agents
                                            </Link>
                                            <button
                                                className="block w-full text-left text-sm font-medium text-gray-900 hover:text-gray-700 py-2"
                                                onClick={handleCreateAgent}
                                            >
                                                Create new agent
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isAdmin && (
                                <>
                                    <Link
                                        href="/admin/models"
                                        className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Models
                                    </Link>
                                    <div className="flex flex-col">
                                        <button
                                            className="w-full flex items-center justify-between text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                            onClick={() => setIsMobileUsersOpen(!isMobileUsersOpen)}
                                        >
                                            Users
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform duration-200 ${
                                                    isMobileUsersOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                        {isMobileUsersOpen && (
                                            <div className="pl-4 flex flex-col gap-2 border-l-2 border-gray-100 ml-1 mt-1">
                                                {adminUsers.map((user) => (
                                                    <Link
                                                        key={user.id}
                                                        href={`/admin/users/${encodeURIComponent(user.username)}`}
                                                        className="block text-sm text-gray-600 hover:text-gray-900 py-2"
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        {user.username}
                                                    </Link>
                                                ))}
                                                <Link
                                                    href="/admin/users"
                                                    className="block text-sm font-medium text-gray-900 hover:text-gray-700 py-2"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    View all users
                                                </Link>
                                                <Link
                                                    href="/admin/users#create-user"
                                                    className="block text-sm font-medium text-gray-900 hover:text-gray-700 py-2"
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    Create new user
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                    <Link
                                        href="/admin/metadata"
                                        className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Metadata
                                    </Link>
                                    <Link
                                        href="/admin/chat-history"
                                        className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Chat history
                                    </Link>
                                    <Link
                                        href="/admin/chat-feedback"
                                        className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Chat feedback
                                    </Link>
                                    <Link
                                        href="https://ptbk.io/"
                                        className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        About
                                    </Link>
                                </>
                            )}

                            {just(false /* TODO: [🧠] Figure out what to do with these links */) && (
                                <Link
                                    href="https://ptbk.io/"
                                    target="_blank"
                                    className="text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Create your server
                                </Link>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
