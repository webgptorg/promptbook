import { HeroClaimRotator } from '@/components/HeroClaimRotator/HeroClaimRotator';
import { LiveTerminalDemo } from '@/components/LiveTerminalDemo/LiveTerminalDemo';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';
import { INSTALL_COMMAND } from '@/data/commands';

/**
 * Renders the hero section with the value proposition, install command and live terminal preview.
 *
 * Note: Specified in [`specs/sections/hero.md`](../../../specs/sections/hero.md)
 */
export function Hero() {
    return (
        <section className="relative overflow-hidden">
            {/* Note: Decorative gradient glow behind the hero */}
            <div
                className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-promptbook-blue-dark/20 to-transparent blur-3xl"
                aria-hidden
            />

            {/* Note: Decorative glow lighting the terminal window from behind */}
            <div
                className="pointer-events-none absolute -right-20 top-8 hidden h-[34rem] w-[34rem] rounded-full bg-promptbook-blue-dark/10 blur-3xl lg:block"
                aria-hidden
            />

            <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 md:pt-24 lg:grid-cols-2 lg:gap-12">
                {/* Note: Both columns are as tall as the taller one of them, so the copy is optically centered
                          against the terminal window instead of floating in a section the terminal alone defines */}
                <div className="flex flex-col justify-center gap-8">
                    <div>
                        <HeroClaimRotator />
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300 lg:mt-8 lg:text-xl lg:leading-relaxed xl:text-[1.375rem]">
                            <strong className="text-white">ptbk coder</strong> drives Claude Code, OpenAI Codex, Gemini
                            CLI and other coding agents through a queue of plain-markdown prompts. It runs your tests
                            after every task, commits what passes and pushes it. You do not have to be at the keyboard
                            for any of it.
                        </p>
                    </div>

                    {/* Note: Installing and starting belong together, so they stay one block */}
                    <div className="max-w-xl">
                        <TerminalBlock command={INSTALL_COMMAND} />

                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href="#quickstart"
                                className="rounded-lg bg-promptbook-blue px-5 py-2.5 font-semibold text-promptbook-dark-gray transition-colors hover:bg-promptbook-green lg:px-6 lg:py-3"
                            >
                                Get started in 3 commands
                            </a>
                            <a
                                href="#how-it-works"
                                className="rounded-lg border border-gray-700 px-5 py-2.5 text-gray-200 transition-colors hover:border-promptbook-blue hover:text-promptbook-blue lg:px-6 lg:py-3"
                            >
                                How it works
                            </a>
                        </div>
                    </div>
                </div>

                <LiveTerminalDemo />
            </div>
        </section>
    );
}
