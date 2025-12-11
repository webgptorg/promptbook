import { HeadlessLink } from '../_utils/headlessParam';

export type FooterLink = {
    title: string;
    url: string;
};

type FooterProps = {
    extraLinks?: FooterLink[];
};

export function Footer(props: FooterProps) {
    const { extraLinks = [] } = props;

    return (
        <footer className="border-t bg-white">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold">
                            Prompt<b>Book</b>
                        </h3>
                        <p className="text-sm text-muted-foreground text-gray-500">
                            {`It's time for a paradigm shift!`}
                            <br />
                            {`The future of software is in plain English ✨`}
                        </p>
                    </div>

                    {/* Products */}
                    <div className="space-y-4">
                        <h3 className="font-bold">Product</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <HeadlessLink href="/get-started" className="text-gray-500 hover:text-gray-900">
                                    Get started
                                </HeadlessLink>
                            </li>
                            <li>
                                <HeadlessLink href="/manifest" className="text-gray-500 hover:text-gray-900">
                                    Manifest
                                </HeadlessLink>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/webgptorg/promptbook"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/terms" className="text-gray-500 hover:text-gray-900">
                                    Terms of Service
                                </HeadlessLink>
                            </li>
                            <li>
                                <HeadlessLink href="/privacy" className="text-gray-500 hover:text-gray-900">
                                    Privacy Policy
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div className="space-y-4">
                        <h3 className="font-bold">Company</h3>
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
                                    About Us
                                </a>
                            </li>
                            <li>
                                <a href="https://ptbk.io/blog" className="text-gray-500 hover:text-gray-900">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/design" className="text-gray-500 hover:text-gray-900">
                                    Logos & Branding
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div className="space-y-4">
                        <h3 className="font-bold">Connect</h3>
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
                                <a
                                    href="https://discord.gg/x3QWNaa89N"
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    Discord
                                </a>
                            </li>
                            <li>
                                <HeadlessLink href="/contact" className="text-gray-500 hover:text-gray-900">
                                    More
                                </HeadlessLink>
                            </li>
                        </ul>
                    </div>

                    {/* Extra Links from Metadata */}
                    {extraLinks.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold">Links</h3>
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
                        All rights reserved.
                        <br />
                        💜
                    </p>
                </div>
                <div className="flex flex-col items-center mt-8">
                    {/* <Image src={TechnologyIncubation} alt="Our Sponsor" className="h-32 w-auto" /> */}
                    <p className="text-center text-sm text-gray-500 mt-4 max-w-lg">
                        This project was implemented with funding from the national budget
                        <br />
                        via the Ministry of Industry and Trade of the Czech Republic within the CzechInvest Technology
                        Incubation programme.
                    </p>
                </div>
            </div>
        </footer>
    );
}
