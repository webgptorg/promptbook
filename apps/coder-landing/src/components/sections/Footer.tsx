import Image from 'next/image';
import logoImage from '@public/logo-white-transparent-1024.png';
import { FOOTER_COLUMNS } from '@/data/links';

/**
 * Renders the page footer, mirroring the footer of https://www.ptbk.io/en adjusted for `ptbk coder`.
 *
 * Note: This is where the relationship to Promptbook is made explicit -
 *       `ptbk coder` is a subproduct of Promptbook, not a separate company,
 *       see [`specs/sections/footer.md`](../../../specs/sections/footer.md)
 */
export function Footer() {
    return (
        <footer className="border-t border-gray-800/80 bg-[#0d1117]">
            <div className="mx-auto max-w-6xl px-4 py-14">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {FOOTER_COLUMNS.map((column) => (
                        <nav key={column.heading} aria-label={column.heading}>
                            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gray-400">
                                {column.heading}
                            </h3>
                            <ul className="mt-4 space-y-2.5">
                                {column.links.map((link) => (
                                    <li key={link.title}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-gray-300 transition-colors hover:text-promptbook-blue"
                                        >
                                            {link.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="mt-12 flex flex-col gap-4 border-t border-gray-800 pt-8 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <Image src={logoImage} alt="Promptbook logo" width={28} height={28} />
                        <span className="font-display font-semibold text-white">Promptbook</span>
                    </div>
                    <p className="text-sm text-gray-500 md:ml-auto md:text-right">
                        ptbk coder is a part of the{' '}
                        <a href="https://www.ptbk.io/en" className="text-gray-300 hover:text-promptbook-blue">
                            Promptbook
                        </a>{' '}
                        ecosystem by AI Web s.r.o.
                        <br />© {new Date().getFullYear()} Promptbook. All rights reserved. Create AI that truly
                        understands your business.
                    </p>
                </div>
            </div>
        </footer>
    );
}
