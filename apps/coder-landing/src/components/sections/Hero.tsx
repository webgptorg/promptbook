import { LiveTerminalDemo } from '@/components/LiveTerminalDemo/LiveTerminalDemo';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';
import { INSTALL_COMMAND, LIVE_RUN_COMMAND } from '@/data/commands';
import { createLiveDemoFrames } from '@/data/createLiveDemoFrames';

/**
 * Renders the hero section with the value proposition, install command and live terminal preview.
 *
 * Note: Specified in [`specs/sections/hero.md`](../../../specs/sections/hero.md)
 */
export async function Hero() {
    const liveDemoFrames = await createLiveDemoFrames();

    return (
        <section className="relative overflow-hidden">
            {/* Note: Decorative gradient glow behind the hero */}
            <div
                className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-promptbook-blue-dark/20 to-transparent blur-3xl"
                aria-hidden
            />

            <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 md:pt-24 lg:grid-cols-2 lg:items-center">
                <div>
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-promptbook-blue-dark/60 bg-promptbook-blue-dark/10 px-3 py-1 text-xs text-promptbook-blue">
                        Part of the Promptbook ecosystem
                    </p>
                    <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
                        Your coding agents,
                        <br />
                        <span className="bg-gradient-to-r from-promptbook-blue to-promptbook-green bg-clip-text text-transparent">
                            running your backlog.
                        </span>
                    </h1>
                    <p className="mt-6 max-w-xl text-lg text-gray-300">
                        <strong className="text-white">ptbk coder</strong> drives Claude Code, OpenAI Codex, Gemini CLI
                        and other coding agents through a queue of plain-markdown prompts — testing, committing and
                        pushing every change, even while you sleep.
                    </p>

                    <div className="mt-8 max-w-xl">
                        <TerminalBlock command={INSTALL_COMMAND} />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <a
                            href="#quickstart"
                            className="rounded-lg bg-promptbook-blue px-5 py-2.5 font-semibold text-promptbook-dark-gray transition-colors hover:bg-promptbook-green"
                        >
                            Get started in 3 commands
                        </a>
                        <a
                            href="#how-it-works"
                            className="rounded-lg border border-gray-700 px-5 py-2.5 text-gray-200 transition-colors hover:border-promptbook-blue hover:text-promptbook-blue"
                        >
                            How it works
                        </a>
                    </div>
                </div>

                <LiveTerminalDemo command={LIVE_RUN_COMMAND} frames={liveDemoFrames} />
            </div>
        </section>
    );
}
