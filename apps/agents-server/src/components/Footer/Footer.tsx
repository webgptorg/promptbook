'use client';

import { CLAIM, NAME, PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { HeadlessLink } from '../_utils/headlessParam';

/**
 * Title/url pair used to extend the footer via metadata.
 *
 * @private Internal to `apps/agents-server`
 */
export type FooterLink = {
    title: string;
    url: string;
};

/**
 * Configuration passed to `Footer` from the layout container.
 *
 * @private Internal to `apps/agents-server`
 */
type FooterProps = {
    extraLinks?: FooterLink[];
};

/**
 * Footer shown on each page of the Agents Server UI, including metadata-driven links and version info.
 *
 * @private Internal to `apps/agents-server`
 */
export function Footer(props: FooterProps) {
    const { extraLinks = [] } = props;
    const { t } = useServerLanguage();

    return (
        <footer className="border-t bg-white">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold">{NAME}</h3>
                        <p className="text-sm text-muted-foreground text-gray-500">{CLAIM}</p>
                    </div>

                    {/* Products */}
                    <div className="space-y-4">
                        <h3 className="font-bold">{t('footer.productSectionTitle')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <HeadlessLink href="/get-started" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.getStarted')}
                                </HeadlessLink>
                            </li>
                            <li>
                                <HeadlessLink href="/manifest" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.manifest')}
                                </HeadlessLink>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/webgptorg/promptbook"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    {t('footer.documentation')}
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/terms" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.termsOfService')}
                                </HeadlessLink>
                            </li>
                            <li>
                                <HeadlessLink href="/privacy" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.privacyPolicy')}
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div className="space-y-4">
                        <h3 className="font-bold">{t('footer.companySectionTitle')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a
                                    href="https://or-justice-cz.translate.goog/ias/ui/rejstrik-firma.vysledky?subjektId=1223693&typ=UPLNY&_x_tr_sl=cs&_x_tr_tl=en&_x_tr_hl=en-US&_x_tr_pto=wapp"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    AI Web, LLC
                                </a>
                            </li>
                            <li>
                                <a href="https://ptbk.io/#about-us" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.aboutUs')}
                                </a>
                            </li>
                            <li>
                                <a href="https://ptbk.io/blog" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.blog')}
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/design" className="text-gray-500 hover:text-gray-900">
                                    {t('footer.logosAndBranding')}
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div className="space-y-4">
                        <h3 className="font-bold">{t('footer.connectSectionTitle')}</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <a
                                    href="https://github.com/webgptorg/promptbook"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://linkedin.com/company/promptbook"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    LinkedIn
                                </a>
                            </li>
                            <li>
                                <a href="https://discord.gg/x3QWNaa89N" className="text-gray-500 hover:text-gray-900">
                                    Discord
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/contact" className="text-gray-500 hover:text-gray-900">
                                    {t('common.more')}
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Extra Links from Metadata */}
                    {extraLinks.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold">{t('footer.linksSectionTitle')}</h3>
                            <ul className="space-y-2 text-sm">
                                {extraLinks.map((link, index) => (
                                    <li key={index}>
                                        <a
                                            href={link.url}
                                            className="text-gray-500 hover:text-gray-900"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {link.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
                    <p>
                        &copy; {new Date().getFullYear()} Promptbook
                        <br />
                        {t('footer.allRightsReserved')}
                        <br />
                        {t('footer.madeInCzechRepublic')}
                        {/* <- TODO: !!!!!!!! Put here Prague outline */}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        {t('footer.engineVersion')} {PROMPTBOOK_ENGINE_VERSION}
                    </p>
                </div>
                {/*
                TODO: [🧠] Should we show this in the footer?
                <div className="flex flex-col items-center mt-8">
                    {/* <Image src={TechnologyIncubation} alt="Our Sponsor" className="h-32 w-auto" /> * /}
                    <p className="text-center text-sm text-gray-500 mt-4 max-w-lg">
                        This project was implemented with funding from the national budget
                        <br />
                        via the Ministry of Industry and Trade of the Czech Republic within the CzechInvest Technology
                        Incubation programme.
                    </p>
                </div>
                */}
            </div>
        </footer>
    );
}
