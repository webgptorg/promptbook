'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import { $createAgentAction, logoutAction } from '@/src/app/actions';
import { ArrowRight, ChevronDown, Lock, LogIn, LogOut, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { HamburgerMenu } from '../../../../../src/book-components/_common/HamburgerMenu/HamburgerMenu';
import { useMenuHoisting } from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { just } from '../../../../../src/utils/organization/just';
import type { UserInfo } from '../../utils/getCurrentUser';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import { HeadlessLink, pushWithHeadless, useIsHeadless } from '../_utils/headlessParam';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { ChangePasswordDialog } from '../ChangePasswordDialog/ChangePasswordDialog';
import { showLoginDialog } from '../AsyncDialogs/asyncDialogs';
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

    /**
     * List of federated servers for navigation dropdown
     */
    federatedServers: Array<{ url: string; title: string; logoUrl?: string | null }>;
    
    /**
     * Is the experimental app enabled
     */
    isExperimental?: boolean;
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
    const { isAdmin = false, currentUser = null, serverName, serverLogoUrl, agents, federatedServers, isExperimental = false } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isAgentsOpen, setIsAgentsOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isUsersOpen, setIsUsersOpen] = useState(false);
    const [isSystemOpen, setIsSystemOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isExperimentsOpen, setIsExperimentsOpen] = useState(false);
    const [isMobileAgentsOpen, setIsMobileAgentsOpen] = useState(false);
    const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
    const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);
    const [isMobileSystemOpen, setIsMobileSystemOpen] = useState(false);
    const [isMobileExperimentsOpen, setIsMobileExperimentsOpen] = useState(false);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const router = useRouter();
    const isHeadless = useIsHeadless();
    const menuHoisting = useMenuHoisting();
    const { formatText } = useAgentNaming();

    const { users: adminUsers } = useUsersAdmin();

    const handleLogout = async () => {
        await logoutAction();
    };

    const handleCreateAgent = async () => {
        setIsCreatingAgent(true);
        const agentName = await $createAgentAction();

        if (agentName) {
            pushWithHeadless(router, `/agents/${agentName}`, isHeadless);
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        } else {
            router.refresh();
            setIsCreatingAgent(false);
            setIsAgentsOpen(false);
            setIsMenuOpen(false);
        }
    };

    // Federated servers dropdown items (respect logo, only current is not clickable)
    const [isFederatedOpen, setIsFederatedOpen] = useState(false);
    // const [isMobileFederatedOpen, setIsMobileFederatedOpen] = useState(false);

    const federatedDropdownItems: SubMenuItem[] = federatedServers.map((server) => {
        const isCurrent = server.url === (typeof window !== 'undefined' ? window.location.origin : '');
        return isCurrent
            ? {
                  label: (
                      <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                              src={server.logoUrl || serverLogoUrl || promptbookLogoBlueTransparent.src}
                              alt={server.title}
                              width={20}
                              height={20}
                              className="w-5 h-5 object-contain rounded-full"
                          />
                          <span className="font-semibold">{server.title.replace(/^Federated: /, '')}</span>
                          <span className="ml-1 text-xs text-blue-600">(current)</span>
                      </span>
                  ),
                  isBold: true,
                  isBordered: true,
              }
            : {
                  label: (
                      <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                              src={server.logoUrl || promptbookLogoBlueTransparent.src}
                              alt={server.title}
                              width={20}
                              height={20}
                              className="w-5 h-5 object-contain rounded-full"
                          />
                          <span>{server.title.replace(/^Federated: /, '')}</span>
                      </span>
                  ),
                  href: server.url,
              };
    });

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
                {
                    label: 'API Reference',
                    href: '/swagger',
                    isBold: true,
                    isBordered: true,
                } as SubMenuItem,
                ...getVisibleCommitmentDefinitions().map(
                    ({ primary, aliases }) =>
                        ({
                            label: (
                                <>
                                    {primary.type}
                                    {aliases.length > 0 && (
                                        <span className="text-gray-400 font-normal"> / {aliases.join(' / ')}</span>
                                    )}
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
                      label: formatText('Agents'),
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
                              label: formatText('View all agents'),
                              href: '/',
                              isBold: true,
                              isBordered: true,
                          } as SubMenuItem,
                          {
                              label: isCreatingAgent ? (
                                  <div className="flex items-center">
                                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                                      {formatText('Creating agent...')}
                                  </div>
                              ) : (
                                  formatText('Create new agent')
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
                      type: 'dropdown' as const,
                      label: 'System',
                      isOpen: isSystemOpen,
                      setIsOpen: setIsSystemOpen,
                      isMobileOpen: isMobileSystemOpen,
                      setIsMobileOpen: setIsMobileSystemOpen,
                      items: [
                          /*
                          Note: [🙍] `/dashboard` page is disabled
                          {
                              label: 'Dashboard',
                              href: '/dashboard',
                              isBold: true,
                              isBordered: true,
                          } as SubMenuItem,
                          */
                          {
                              label: 'OpenAPI Documentation',
                              href: '/swagger',
                          },
                          {
                              label: 'API Tokens',
                              href: '/admin/api-tokens',
                          },
                          {
                              label: 'Metadata',
                              href: '/admin/metadata',
                          },
                          {
                              label: 'Chat history',
                              href: '/admin/chat-history',
                          },
                          {
                              label: 'Messages & Emails',
                              href: '/admin/messages',
                          },
                          {
                              label: 'Chat feedback',
                              href: '/admin/chat-feedback',
                          },
                          {
                              label: 'Browser',
                              href: '/admin/browser-test',
                          },
                          {
                              label: 'Voice Input Test',
                              href: '/admin/voice-input-test',
                          },
                          // Note: Commented out because image generator can became a paid feature later for the clients
                          // {
                          //     label: 'Image Generator Test',
                          //     href: '/admin/image-generator-test',
                          // },
                          {
                              label: 'Search Engine Test',
                              href: '/admin/search-engine-test',
                          },
                          {
                              label: 'Images gallery',
                              href: '/admin/images',
                          },
                          {
                              label: 'Files',
                              href: '/admin/files',
                          },
                      ],
                  },
                  ...(isExperimental
                      ? [
                            {
                                type: 'dropdown' as const,
                                label: 'Experiments',
                                isOpen: isExperimentsOpen,
                                setIsOpen: setIsExperimentsOpen,
                                isMobileOpen: isMobileExperimentsOpen,
                                setIsMobileOpen: setIsMobileExperimentsOpen,
                                items: [
                                    {
                                        label: 'Story',
                                        href: '/story',
                                        isBold: true,
                                    },
                                ],
                            },
                        ]
                      : []),
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
            {isChangePasswordOpen && <ChangePasswordDialog onClose={() => setIsChangePasswordOpen(false)} />}
            <div className="container w-full mx-auto px-4 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo and heading */}
                    <HeadlessLink
                        href="/"
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden min-w-0 flex-shrink-0 lg:flex-shrink-1"
                    >
                        {serverLogoUrl ? (
                            // Note: `next/image` does not load external images well without extra config
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={serverLogoUrl}
                                alt={serverName}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain flex-shrink-0"
                            />
                        ) : (
                            <Image
                                src={promptbookLogoBlueTransparent}
                                alt={serverName}
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain flex-shrink-0"
                            />
                        )}
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 truncate">{serverName}</h1>
                    </HeadlessLink>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">
                        {/* Federated servers dropdown - only show if there are federated servers */}
                        {federatedServers.length > 0 && (
                            <div className="relative">
                                <button
                                    className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                    onClick={() => setIsFederatedOpen(!isFederatedOpen)}
                                    onBlur={() => setTimeout(() => setIsFederatedOpen(false), 200)}
                                >
                                    <ChevronDown className="w-4 h-4" />
                                    <span>Switch server</span>
                                </button>
                                {isFederatedOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                        {federatedDropdownItems.map((subItem, subIndex) => {
                                            const className = `block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${
                                                subItem.isBold ? 'font-medium' : ''
                                            } ${subItem.isBordered ? 'border-b border-gray-100' : ''}`;

                                            if (subItem.href) {
                                                return (
                                                    <HeadlessLink
                                                        key={subIndex}
                                                        href={subItem.href}
                                                        className={className}
                                                        onClick={() => setIsFederatedOpen(false)}
                                                    >
                                                        {subItem.label}
                                                    </HeadlessLink>
                                                );
                                            }
                                            return (
                                                <span key={subIndex} className={className}>
                                                    {subItem.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {menuItems.map((item, index) => {
                            if (item.type === 'link') {
                                return (
                                    <HeadlessLink
                                        key={index}
                                        href={item.href}
                                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                                    >
                                        {item.label}
                                    </HeadlessLink>
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
                                                        <HeadlessLink
                                                            key={subIndex}
                                                            href={subItem.href!}
                                                            className={className}
                                                            onClick={() => item.setIsOpen(false)}
                                                        >
                                                            {subItem.label}
                                                        </HeadlessLink>
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
                            <a
                                href="https://ptbk.io/"
                                target="_blank"
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                Create your server
                            </a>
                        )}
                    </nav>

                    {/* Hoisted Menu Items */}
                    {menuHoisting && menuHoisting.menu.length > 0 && (
                        <div className="hidden lg:flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
                            {menuHoisting.menu.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={item.onClick}
                                    className={`p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 ${
                                        item.isActive ? 'bg-gray-100 text-gray-900' : ''
                                    }`}
                                    title={item.name}
                                >
                                    {item.icon}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* CTA Button & Mobile Menu Toggle */}
                    <div className="flex items-center gap-4">
                        {just(false /* TODO: [🧠] Figure out what to do with call to action */) && (
                            <a href="https://ptbk.io/?modal=get-started" target="_blank" className="hidden md:block">
                                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90">
                                    Get Started
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </a>
                        )}

                        {!currentUser && !isAdmin && (
                            <button
                                onClick={() => {
                                    void showLoginDialog().catch(() => undefined);
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
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
                                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="leading-none">{currentUser?.username || 'Admin'}</span>
                                            {(currentUser?.isAdmin || isAdmin) && (
                                                <span className="text-xs text-blue-600">Admin</span>
                                            )}
                                        </div>
                                        <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                                    </button>

                                    {isProfileOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {currentUser?.username || 'Admin'}
                                                </p>
                                                {(currentUser?.isAdmin || isAdmin) && (
                                                    <p className="text-xs text-blue-600 mt-1">Administrator</p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => setIsChangePasswordOpen(true)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                                            >
                                                <Lock className="w-4 h-4" />
                                                Change Password
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Log out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <div className="lg:hidden">
                            <HamburgerMenu
                                isOpen={isMenuOpen}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-gray-600 hover:text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div
                        className="lg:hidden absolute top-16 left-0 right-0 z-50 bg-white shadow-xl py-4 border-t border-gray-100 animate-in slide-in-from-top-2 h-[calc(100vh-4rem)] overflow-y-auto"
                        style={{
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <nav className="container mx-auto flex flex-col gap-4 px-6">
                            {/* Hoisted Menu Items for Mobile */}
                            {menuHoisting && menuHoisting.menu.length > 0 && (
                                <div className="py-2 border-b border-gray-100 mb-2 flex gap-2 overflow-x-auto">
                                    {menuHoisting.menu.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                item.onClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 ${
                                                item.isActive ? 'bg-gray-100 text-gray-900' : ''
                                            }`}
                                            title={item.name}
                                        >
                                            {item.icon}
                                            <span className="sr-only">{item.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Login Status for Mobile */}
                            <div className="py-2 border-b border-gray-100 mb-2">
                                {!currentUser && !isAdmin && (
                                    <button
                                        onClick={() => {
                                            void showLoginDialog().catch(() => undefined);
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
                                                setIsChangePasswordOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900 w-full"
                                        >
                                            <Lock className="w-4 h-4" />
                                            Change Password
                                        </button>
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
                                        <HeadlessLink
                                            key={index}
                                            href={item.href}
                                            className="block text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {item.label}
                                        </HeadlessLink>
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
                                                            <HeadlessLink
                                                                key={subIndex}
                                                                href={subItem.href!}
                                                                className={className}
                                                                onClick={() => setIsMenuOpen(false)}
                                                            >
                                                                {subItem.label}
                                                            </HeadlessLink>
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
                                <a
                                    href="https://ptbk.io/"
                                    target="_blank"
                                    className="text-base font-medium text-gray-600 hover:text-gray-900 py-2"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Create your server
                                </a>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
