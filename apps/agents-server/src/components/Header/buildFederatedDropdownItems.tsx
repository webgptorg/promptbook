'use client';

import promptbookLogoBlueTransparent from '@/public/logo-blue-white-256.png';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Metadata needed to render one federated-server dropdown entry.
 *
 * @private type of Header
 */
type FederatedServerMenuItem = {
    readonly logoUrl?: string | null;
    readonly title: string;
    readonly url: string;
};

/**
 * Options required to build the federated-server switcher items.
 *
 * @private type of Header
 */
type BuildFederatedDropdownItemsOptions = {
    readonly currentFederatedServerLabel: string;
    readonly currentOrigin: string;
    readonly federatedServers: ReadonlyArray<FederatedServerMenuItem>;
    readonly serverLogoUrl: string | null;
};

/**
 * Removes the "Federated:" prefix from switcher labels while keeping existing titles intact elsewhere.
 *
 * @private function of Header
 */
function normalizeFederatedServerTitle(title: string): string {
    return title.replace(/^Federated: /, '');
}

/**
 * Builds the dropdown entries for switching between federated servers.
 *
 * @private function of Header
 */
export function buildFederatedDropdownItems({
    currentFederatedServerLabel,
    currentOrigin,
    federatedServers,
    serverLogoUrl,
}: BuildFederatedDropdownItemsOptions): SubMenuItem[] {
    return federatedServers.map((server) => {
        const normalizedTitle = normalizeFederatedServerTitle(server.title);
        const isCurrent = server.url === currentOrigin;

        if (isCurrent) {
            return {
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
                        <span className="font-semibold">{normalizedTitle}</span>
                        <span className="ml-1 text-xs text-blue-600">{currentFederatedServerLabel}</span>
                    </span>
                ),
                isBold: true,
                isBordered: true,
            };
        }

        return {
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
                    <span>{normalizedTitle}</span>
                </span>
            ),
            href: server.url,
        };
    });
}
