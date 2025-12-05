'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { $createAgentAction, logoutAction } from '@/src/app/actions';
import { ArrowRight, ChevronDown, LogIn, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { just } from '../../../../../src/utils/organization/just';
import type { UserInfo } from '../../utils/getCurrentUser';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
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

type SubMenuItem = {
    label: ReactNode;
    href?: string;
    onClick?: () => void | Promise<void>;
    isBold?: boolean;
    isBordered?: boolean;
};

type MenuItem =
    | {
          type: 'link';
          label: ReactNode;
          href: string;
      }
    | {
          type: 'dropdown';
          label: ReactNode;
          isOpen: boolean;
          setIsOpen: (isOpen: boolean) => void;
          isMobileOpen: boolean;
          setIsMobileOpen: (isOpen: boolean) => void;
          items: Array<SubMenuItem>;
      };

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
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const router = useRouter();

    const { users: adminUsers } = useUsersAdmin();

    const handleLogout = async () => {
        await logoutAction();
    };

    const handleCreateAgent = async () => {
        setIsCreatingAgent(true);
        const agentName = await $createAgentAction();

        if (agentName) {
            router.push(`/agents/${agentName}`);
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        } else {
            router.refresh();
            setIsCreatingAgent(false);
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        }
    };

    // Menu items configuration (DRY principle)
    const menuItems: MenuItem[] = [
        {
            type: 'link' as const,
            label: 'Home',
            href: '/',
        },
        {
            type: 'dropdown' as const,
            label: 'Documentation',
            isOpen: isDocsOpen,
            setIsOpen: setIsDocsOpen,
            isMobileOpen: isMobileDocsOpen,
            setIsMobileOpen: setIsMobileDocsOpen,
            items: [
                {
                    label: 'Overview',
                    href: '/docs',
                    isBold: true,
                    isBordered: true,
                } as SubMenuItem,
                ...getVisibleCommitmentDefinitions().map(
                    ({ primary, aliases }) =>
                        ({
                            label: (
                                <>
                                    {primary.type}
                                    {aliases.length > 0 && <span className="text-gray-400 font-normal"> / {aliases.join(' / ')}</span>}
                                </>
                            ),
                            href: `/docs/${primary.type}`,
                        } as SubMenuItem),
                ),
            ],
        },
        ...(isAdmin
            ? [
                  {
                      type: 'dropdown' as const,
                      label: 'Agents',
                      isOpen: isAgentsOpen,
                      setIsOpen: setIsAgentsOpen,
                      isMobileOpen: isMobileAgentsOpen,
                      setIsMobileOpen: setIsMobileAgentsOpen,
                      items: [
                          ...agents.map(
                              (agent) =>
                                  ({
                                      label: agent.meta.fullname || agent.agentName,
                                      href: `/${agent.agentName}`,
                                  } as SubMenuItem),
                          ),
                          {
                              label: 'View all agents',
                              href: '/',
                              isBold: true,
                              isBordered: true,
                          } as SubMenuItem,
                          {
                              label: isCreatingAgent ? (
                                  <div className="flex items-center">
                                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                      Creating agent...
                                  </div>
                              ) : (
                                  'Create new agent'
                              ),
                              onClick: isCreatingAgent ? undefined : handleCreateAgent,
                              isBold: true,
                          } as SubMenuItem,
                      ],
                  },
                  {
                      type: 'link' as const,
                      label: 'Models',
                      href: '/admin/models',
                  },
                  {
                      type: 'dropdown' as const,
                      label: 'Users',
                      isOpen: isUsersOpen,
                      setIsOpen: setIsUsersOpen,
                      isMobileOpen: isMobileUsersOpen,
                      setIsMobileOpen: setIsMobileUsersOpen,
                      items: [
                          ...adminUsers.map(
                              (user) =>
                                  ({
                                      label: user.username,
                                      href: `/admin/users/${encodeURIComponent(user.username)}`,
                                  } as SubMenuItem),
                          ),
                          {
                              label: 'View all users',
                              href: '/admin/users',
                              isBold: true,
                              isBordered: true,
                          } as SubMenuItem,
                          {
                              label: 'Create new user',
                              href: '/admin/users#create-user',
                              isBold: true,
                          } as SubMenuItem,
                      ],
                  },
                  {
                      type: 'link' as const,
                      label: 'Metadata',
                      href: '/admin/metadata',
                  },
                  {
                      type: 'link' as const,
                      label: 'Chat history',
                      href: '/admin/chat-history',
                  },
                  {
                      type: 'link' as const,
                      label: 'Chat feedback',
                      href: '/admin/chat-feedback',
                  },
                  {
                      type: 'link' as const,
                      label: 'About',
                      href: 'https://ptbk.io/',
                  },
              ]
            : []),
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16">
            <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
            <div className="container mx-auto px-4 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        {serverLogoUrl ? (
                            // Note: `next/image` does not load external images well without extra config
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={serverLogoUrl}
                                alt={serverName}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain"
                            />
                        ) : (
                            <Image
                                src={promptbookLogoBlueTransparent}
                                alt={serverName}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain"
                            />
                        )}
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">{serverName}</h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">
                        {menuItems.map((item, index) => {
                            if (item.type === 'link') {
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                    >
                                        {item.label}
                                    </Link>
                                );
                            }

                            if (item.type === 'dropdown') {
                                return (
                                    <div key={index} className="relative">
                                        <button
                                            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                            onClick={() => item.setIsOpen(!item.isOpen)}
                                            onBlur={() => setTimeout(() => item.setIsOpen(false), 200)}
                                        >
                                            {item.label}
                                            <ChevronDown className="w-4 h-4" />
                                        </button>

                                        {item.isOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                                {item.items.map((subItem, subIndex) => {
                                                    const className = `block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${
                                                        subItem.isBold ? 'font-medium' : ''
                                                    } ${subItem.isBordered ? 'border-b border-gray-100' : ''}`;

                                                    if (subItem.onClick) {
                                                        return (
                                                            <button
                                                                key={subIndex}
                                                                onClick={subItem.onClick}
                                                                className={`${className} w-full text-left`}
                                                            >
                                                                {subItem.label}
                                                            </button>
                                                        );
                                                    }

                                                    return (
                                                        <Link
                                                            key={subIndex}
                                                            href={subItem.href!}
                                                            className={className}
                                                            onClick={() => item.setIsOpen(false)}
                                                        >
                                                            {subItem.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return null;
                        })}

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
                        <HamburgerMenu
                            isOpen={isMenuOpen}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                        />
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div
                        className="lg:hidden absolute top-16 left-0 right-0 z-50 bg-white/80 shadow-xl py-4 border-t border-gray-100 animate-in slide-in-from-top-2 h-[calc(100vh-4rem)] overflow-y-auto"
                        style={{
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <nav className="container mx-auto flex flex-col gap-4 px-6">
                            {/* Login Status for Mobile */}
                            <div className="py-2 border-b border-gray-100 mb-2">
                                {!currentUser && !isAdmin && (
                                    <button
                                        onClick={() => {
                                            setIsLoginOpen(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900 w-full"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Log in
                                    </button>
                                )}

                                {(currentUser || isAdmin) && (
                                    <div className="flex flex-col gap-3">
                                        <div className="text-sm text-gray-600">
                                            Logged in as <strong>{currentUser?.username || 'Admin'}</strong>
                                            {(currentUser?.isAdmin || isAdmin) && (
                                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="flex items-center gap-2 text-base font-medium text-red-600 hover:text-red-700 w-full"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Log out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {menuItems.map((item, index) => {
                                if (item.type === 'link') {
                                    return (
                                        <Link
                                            key={index}
                                            href={item.href}
                                            className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                }

                                if (item.type === 'dropdown') {
                                    return (
                                        <div key={index} className="flex flex-col">
                                            <button
                                                className="w-full flex items-center justify-between text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                                onClick={() => item.setIsMobileOpen(!item.isMobileOpen)}
                                            >
                                                {item.label}
                                                <ChevronDown
                                                    className={`w-4 h-4 transition-transform duration-200 ${
                                                        item.isMobileOpen ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                            {item.isMobileOpen && (
                                                <div className="pl-4 flex flex-col gap-2 border-l-2 border-gray-100 ml-1 mt-1">
                                                    {item.items.map((subItem, subIndex) => {
                                                        const className = `block text-sm ${
                                                            subItem.isBold
                                                                ? 'font-medium text-gray-900 hover:text-gray-700'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                        } py-2`;

                                                        if (subItem.onClick) {
                                                            return (
                                                                <button
                                                                    key={subIndex}
                                                                    className={`${className} w-full text-left`}
                                                                    onClick={subItem.onClick}
                                                                >
                                                                    {subItem.label}
                                                                </button>
                                                            );
                                                        }

                                                        return (
                                                            <Link
                                                                key={subIndex}
                                                                href={subItem.href!}
                                                                className={className}
                                                                onClick={() => setIsMenuOpen(false)}
                                                            >
                                                                {subItem.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return null;
                            })}

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
