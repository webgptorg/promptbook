'use client';

import { ChevronDown, Lock, LogIn, LogOut } from 'lucide-react';
import type { UserInfo } from '../../utils/getCurrentUser';

/**
 * Props for the extracted desktop login/profile section.
 *
 * @private type of Header
 */
type HeaderDesktopUserMenuProps = {
    readonly adminLabel: string;
    readonly cancelMenuClose: (menuId: string) => void;
    readonly changePasswordLabel: string;
    readonly closeProfileDesktopDropdown: () => void;
    readonly currentUser: UserInfo | null;
    readonly currentUserAvatarLabel: string;
    readonly currentUserDisplayName: string;
    readonly currentUserProfileImageUrl: string | null;
    readonly isAdmin: boolean;
    readonly isProfileDesktopPointerEnabled: boolean;
    readonly isProfileOpen: boolean;
    readonly logInLabel: string;
    readonly logOutLabel: string;
    readonly onLogin: () => void;
    readonly onLogout: () => void;
    readonly onOpenChangePassword: () => void;
    readonly scheduleMenuClose: (menuId: string, close: () => void) => void;
    readonly setIsProfileOpen: (isOpen: boolean) => void;
    readonly startDesktopDropdownPreview: (menuId: string, isOpen: boolean, open: () => void) => void;
    readonly toggleProfileDesktopDropdown: () => void;
};

/**
 * Renders the desktop-only login button or current-user profile dropdown.
 *
 * @private function of Header
 */
export function HeaderDesktopUserMenu({
    adminLabel,
    cancelMenuClose,
    changePasswordLabel,
    closeProfileDesktopDropdown,
    currentUser,
    currentUserAvatarLabel,
    currentUserDisplayName,
    currentUserProfileImageUrl,
    isAdmin,
    isProfileDesktopPointerEnabled,
    isProfileOpen,
    logInLabel,
    logOutLabel,
    onLogin,
    onLogout,
    onOpenChangePassword,
    scheduleMenuClose,
    setIsProfileOpen,
    startDesktopDropdownPreview,
    toggleProfileDesktopDropdown,
}: HeaderDesktopUserMenuProps) {
    if (!currentUser && !isAdmin) {
        return (
            <button
                onClick={onLogin}
                className="hidden lg:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
                {logInLabel}
                <LogIn className="ml-2 w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="hidden lg:flex items-center gap-3">
            <div
                className="relative"
                onMouseEnter={() =>
                    startDesktopDropdownPreview('profile-menu', isProfileOpen, () => setIsProfileOpen(true))
                }
                onMouseLeave={() => scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))}
            >
                <button
                    type="button"
                    onClick={toggleProfileDesktopDropdown}
                    onMouseEnter={() => {
                        startDesktopDropdownPreview('profile-menu', isProfileOpen, () => setIsProfileOpen(true));
                    }}
                    onBlur={() => scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
                    aria-expanded={isProfileOpen}
                >
                    <div className="relative flex h-8 w-8 items-center justify-center">
                        {currentUserProfileImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={currentUserProfileImageUrl}
                                alt={`${currentUserDisplayName} avatar`}
                                className="h-8 w-8 rounded-full border border-gray-100 object-cover"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {currentUserAvatarLabel}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="leading-none">{currentUserDisplayName}</span>
                        {(currentUser?.isAdmin || isAdmin) && <span className="text-xs text-blue-600">{adminLabel}</span>}
                    </div>
                    <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                </button>

                {isProfileOpen && (
                    <div
                        className={`absolute top-full right-0 mt-2 w-56 bg-white/95 rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur ${
                            isProfileDesktopPointerEnabled ? 'pointer-events-auto' : 'pointer-events-none'
                        }`}
                        onMouseEnter={() => cancelMenuClose('profile-menu')}
                        onMouseLeave={() => scheduleMenuClose('profile-menu', () => setIsProfileOpen(false))}
                    >
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900">{currentUserDisplayName}</p>
                            {(currentUser?.isAdmin || isAdmin) && <p className="text-xs text-blue-600 mt-1">{adminLabel}</p>}
                        </div>

                        <button
                            onClick={() => {
                                onOpenChangePassword();
                                closeProfileDesktopDropdown();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                        >
                            <Lock className="w-4 h-4" />
                            {changePasswordLabel}
                        </button>

                        <button
                            onClick={() => {
                                closeProfileDesktopDropdown();
                                onLogout();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            {logOutLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
